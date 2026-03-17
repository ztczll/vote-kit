import Router from '@koa/router';
import { Context } from 'koa';
import { forgeEngineService } from '../services/forge-engine.service';
import { dockerService } from '../services/docker.service';
import { jenkinsService } from '../services/jenkins.service';
import { SpecGeneratorService } from '../services/spec-generator.service';
import { AppTemplateService } from '../services/app-template.service';
import { PromptTemplateService } from '../services/prompt-template.service';
import db from '../config/database';
import { authenticate } from '../middleware/auth.middleware';
import { getPrototypeArtifactPath, getPrototypeArtifactUrl } from '../services/prototype.service';
import { checkQuota, getUserPlan, getPlanLimits, deductQuota } from '../services/plan.service';
import { checkAndIncrementIpLimit, checkAndIncrementUserCodeLimit } from '../services/rate-limit.service';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const router = new Router();
const specGenerator = new SpecGeneratorService(new AppTemplateService(), new PromptTemplateService());

/** 与 Jenkins 部署一致的公网访问域名后缀，用于返回 access_url（如 .apps.example.com） */
const DEPLOY_PUBLIC_DOMAIN_SUFFIX = process.env.DEPLOY_PUBLIC_DOMAIN_SUFFIX || '.apps.example.com';
function getAccessUrl(subdomain: string): string {
  return `http://${subdomain}${DEPLOY_PUBLIC_DOMAIN_SUFFIX}`;
}

// Generate new application - 登录用户按套餐额度触发
router.post('/generate', authenticate, async (ctx: Context) => {
  try {
    const userId = ctx.state.user.id;
    const ip = ctx.request.ip || ctx.ip || '';
    const ipLimit = await checkAndIncrementIpLimit(ip, 'code');
    if (!ipLimit.allowed) {
      ctx.status = 429;
      ctx.body = { success: false, message: ipLimit.message, code: 'RATE_LIMIT' };
      return;
    }
    const userCodeLimit = await checkAndIncrementUserCodeLimit(userId);
    if (!userCodeLimit.allowed) {
      ctx.status = 429;
      ctx.body = { success: false, message: userCodeLimit.message, code: 'RATE_LIMIT' };
      return;
    }
    const quota = await checkQuota(userId, 'code_generation');
    if (!quota.allowed) {
      ctx.status = 403;
      ctx.body = { success: false, message: quota.message || '本月完整代码生成次数已用尽', code: 'QUOTA_EXCEEDED' };
      return;
    }

    // Deduct quota immediately to prevent race condition
    await deductQuota(userId, 'code_generation');

    const { requirementId, devPlan, forgePrompt, publishToSquare } = ctx.request.body as {
      requirementId: number;
      devPlan: string;
      forgePrompt?: any;
      publishToSquare?: boolean;
    };

    if (!requirementId || !devPlan) {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少必要参数' };
      return;
    }

    // Get requirement details
    const requirement = await db('requirements').where('id', requirementId).first();
    if (!requirement) {
      ctx.status = 404;
      ctx.body = { success: false, message: '需求不存在' };
      return;
    }

    console.log('📋 Found requirement:', {
      id: requirement.id,
      title: requirement.title,
      description: requirement.description,
      scenario: requirement.scenario,
      pain_points: requirement.pain_points
    });

    // Generate unique subdomain
    const subdomain = `app-${requirementId}-${Date.now()}`;
    
    // Generate app name - handle Chinese characters properly
    let appName = requirement.title || 'untitled-app';
    // For Chinese titles, use pinyin or keep original, then clean up
    if (/[\u4e00-\u9fff]/.test(appName)) {
      // If contains Chinese characters, use a fallback approach
      appName = `app-${Date.now()}`;
    } else {
      // For English titles, clean up special characters
      appName = appName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
    }
    
    // Ensure name is not empty or just dashes
    if (!appName || /^-+$/.test(appName)) {
      appName = `app-${Date.now()}`;
    }

    // Create app record (default private; user may opt-in to publish to square)
    const [appId] = await db('generated_apps').insert({
      requirement_id: requirement.id,
      name: appName,
      description: requirement.description,
      subdomain,
      status: 'generating',
      created_by: ctx.state.user.id,
      forge_prompt: forgePrompt ? JSON.stringify(forgePrompt) : null,
      is_public: publishToSquare === true
    });

    const planLimits = await getPlanLimits((await getUserPlan(ctx.state.user.id)).plan);
    const genTaskId = randomUUID();
    await db('gen_tasks').insert({
      id: genTaskId,
      user_id: ctx.state.user.id,
      requirement_id: requirement.id,
      generated_app_id: appId,
      priority: planLimits.queuePriority || 'normal',
      status: 'pending',
    });

    // Start generation process (async)
    setImmediate(async () => {
      try {
        console.log(`🚀 Starting Forge Engine generation for app ${appId}`);
        
        // Build comprehensive prompt from requirement data
        let generationInput = '';
        
        if (forgePrompt) {
          // Use Coze-generated prompt if available
          generationInput = typeof forgePrompt === 'string' ? forgePrompt : JSON.stringify(forgePrompt);
        } else {
          // Prefer Spec (template + prompt templates) when requirement has app_template_id or prompt_template_ids
          const specPrompt = await specGenerator.buildPromptFromRequirement({
            title: requirement.title,
            description: requirement.description,
            scene: requirement.scene,
            pain: requirement.pain,
            features: requirement.features,
            extra: requirement.extra,
            app_template_id: requirement.app_template_id,
            prompt_template_ids: requirement.prompt_template_ids,
          });
          if (specPrompt) {
            generationInput = specPrompt + (devPlan ? `\n\n## 开发计划\n${devPlan}` : '');
          } else {
            // Fallback: legacy prompt from requirement + devPlan
            generationInput = `基于以下需求创建应用：

标题：${requirement.title}
描述：${requirement.description || '无详细描述'}
场景：${requirement.scene ?? requirement.scenario ?? '无场景描述'}
痛点：${requirement.pain ?? requirement.pain_points ?? '无痛点描述'}

开发计划：
${devPlan}

请生成一个完整的、可运行的应用程序。`;
          }
        }

        // 确保发往 Forge 的 prompt 始终包含容器化要求（即便魔法编辑或 fallback 未包含）
        const DOCKER_REQUIREMENTS = `

## Docker 与容器化部署（必选）
- 必须在应用**根目录**提供 **Dockerfile**，使在项目根目录执行 \`docker build -t <镜像名>:latest .\` 即可构建出可运行镜像。
- 镜像需支持后续：\`docker tag <镜像名>:latest registry.cn-shanghai.aliyuncs.com/<命名空间>/<镜像名>:latest\` 与 \`docker push\` 至阿里云 ACR。
- 建议提供 **.dockerignore**，排除 node_modules、.git、日志等，以减小构建上下文、加快构建。
请确保输出包含上述 Docker 相关文件。`;
        if (!generationInput.includes('Dockerfile') || !generationInput.includes('docker build')) {
          generationInput = generationInput.trimEnd() + DOCKER_REQUIREMENTS;
        }

        // 若有该需求对应的原型文件，将原型地址写入 prompt，供 Forge/Kiro/Cursor 作为参考（不传 HTML 内容）
        const prototypePath = getPrototypeArtifactPath(requirementId);
        if (fs.existsSync(prototypePath)) {
          const prototypeUrl = getPrototypeArtifactUrl(requirementId);
          generationInput = generationInput.trimEnd() + `

## 原型参考（仅供辅助生成）
以下链接为基于当前需求生成的原型示例页面，可用于辅助理解界面与交互，请勿直接复制其代码。请根据上述需求文档与开发计划生成完整、可运行的应用，可参考该原型的布局与结构。
原型示例地址：${prototypeUrl}`;
        }

        // Submit task to Forge Engine (priority queue by plan)
        const taskId = await forgeEngineService.submitTask(
          appId.toString(),
          appName,
          generationInput,
          ctx.state.user.id,
          requirementId.toString(),
          planLimits.queuePriority || 'normal'
        );
        
        console.log(`📤 Task ${taskId} submitted to Forge Engine for app ${appId}`);
        
        // 保存任务ID
        await db('generated_apps')
          .where('id', appId)
          .update({ forge_task_id: taskId });
        
        // Note: Status will be updated via callback when Forge Engine completes
      } catch (error: any) {
        console.error(`❌ Forge Engine submission failed for app ${appId}:`, error.message);
        
        await db('generated_apps')
          .where('id', appId)
          .update({ status: 'error' });
      }
    });

    ctx.body = {
      success: true,
      data: { appId, subdomain, status: 'generating' }
    };
  } catch (error: any) {
    console.error('App generation error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '生成失败' };
  }
});

// Jenkins 构建结束回调（无鉴权，由 Jenkins 流水线在 success/failure 时调用）
router.post('/jenkins-callback', async (ctx: Context) => {
  try {
    const body = ctx.request.body as { app_id?: string; build_result?: string };
    const appId = body.app_id != null ? Number(body.app_id) : NaN;
    const buildResult = (body.build_result || '').toLowerCase();

    if (!Number.isInteger(appId) || appId <= 0) {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少或无效的 app_id' };
      return;
    }
    if (buildResult !== 'success' && buildResult !== 'failure') {
      ctx.status = 400;
      ctx.body = { success: false, message: 'build_result 须为 success 或 failure' };
      return;
    }

    const app = await db('generated_apps').where('id', appId).first();
    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在' };
      return;
    }
    if (app.status !== 'deploying') {
      ctx.body = { success: true, message: '状态已非 deploying，已忽略' };
      return;
    }

    const newAppStatus = buildResult === 'success' ? 'running' : 'error';
    const newDeployStatus = buildResult === 'success' ? 'running' : 'failed';

    await db('generated_apps').where('id', appId).update({
      status: newAppStatus,
      updated_at: db.fn.now(),
    });

    const deployment = await db('app_deployments')
      .where('app_id', appId)
      .orderBy('created_at', 'desc')
      .first();
    if (deployment) {
      await db('app_deployments').where('id', deployment.id).update({
        status: newDeployStatus,
        ...(buildResult === 'failure' ? { logs: 'Jenkins 构建或部署失败' } : {}),
      });
    }

    ctx.body = { success: true, data: { app_id: appId, status: newAppStatus } };
  } catch (error: any) {
    console.error('Jenkins callback error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '回调处理失败' };
  }
});

// Get application status
router.get('/:id/status', authenticate, async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在' };
      return;
    }

    // Get deployment info if exists
    const deployment = await db('app_deployments')
      .where('app_id', appId)
      .orderBy('created_at', 'desc')
      .first();

    ctx.body = {
      success: true,
      data: {
        id: app.id,
        name: app.name,
        status: app.status,
        subdomain: app.subdomain,
        access_url: getAccessUrl(app.subdomain),
        deployment: deployment ? {
          status: deployment.status,
          port: deployment.port,
          containerId: deployment.docker_container_id
        } : null
      }
    };
  } catch (error: any) {
    console.error('Status check error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '状态查询失败' };
  }
});

// Deploy application
router.post('/:id/deploy', authenticate, async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .where('created_by', ctx.state.user.id)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在或无权限' };
      return;
    }

    if (app.status !== 'ready' && app.status !== 'error') {
      ctx.status = 400;
      ctx.body = { success: false, message: '当前状态不支持部署，仅支持就绪或错误状态重新部署' };
      return;
    }

    // Update status to deploying
    await db('generated_apps')
      .where('id', appId)
      .update({ status: 'deploying' });

    // Create deployment record（仅记录逻辑层状态，具体容器由 Jenkins 负责）
    const [deploymentId] = await db('app_deployments').insert({
      app_id: appId,
      status: 'pending'
    });

    // Start deployment via Jenkins (async)
    setImmediate(async () => {
      try {
        console.log(`🚀 Starting Jenkins deployment for app ${appId}`);

        const jenkinsResult = await jenkinsService.triggerBuild({
          appId,
          appName: app.name,
          subdomain: app.subdomain,
          deployMode: app.deploy_mode as 'local' | 'registry' | undefined,
          registryImage: app.image_name || undefined,
        });

        const jenkins_build_url = jenkinsResult?.buildUrlHint || null;

        await db('app_deployments')
          .where('id', deploymentId)
          .update({
            status: 'building',
            logs: jenkinsResult?.queueUrl || null,
          });

        // 若未执行迁移（无 jenkins_job_name 等列），仅更新 status，避免报错
        try {
          await db('generated_apps')
            .where('id', appId)
            .update({
              status: 'deploying',
              jenkins_job_name: process.env.JENKINS_JOB_NAME || 'forge-generated-app-deploy',
              jenkins_build_url,
            });
        } catch (colErr: any) {
          if (colErr.message && colErr.message.includes('Unknown column')) {
            await db('generated_apps').where('id', appId).update({ status: 'deploying' });
          } else {
            throw colErr;
          }
        }

        console.log(`✅ Jenkins build triggered for app ${appId}`, jenkinsResult);
      } catch (error: any) {
        console.error(`❌ Jenkins deployment trigger failed for app ${appId}:`, error.message);
        
        await db('app_deployments')
          .where('id', deploymentId)
          .update({ status: 'failed', logs: error.message });

        await db('generated_apps')
          .where('id', appId)
          .update({ status: 'error' });
      }
    });

    ctx.body = {
      success: true,
      data: { status: 'deploying' }
    };
  } catch (error: any) {
    console.error('Deployment error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '部署失败' };
  }
});

// List user's applications (with requirement prototype info for card display)
router.get('/my-apps', authenticate, async (ctx: Context) => {
  try {
    const rows = await db('generated_apps')
      .where('generated_apps.created_by', ctx.state.user.id)
      .select(
        'generated_apps.*',
        'requirements.title as requirement_title',
        'requirements.prototype_screenshot_url as prototype_screenshot_url'
      )
      .leftJoin('requirements', 'generated_apps.requirement_id', 'requirements.id')
      .orderBy('generated_apps.created_at', 'desc');

    const apps = rows.map((a: any) => ({ ...a, access_url: getAccessUrl(a.subdomain) }));

    ctx.body = {
      success: true,
      data: apps
    };
  } catch (error: any) {
    console.error('List apps error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '获取应用列表失败' };
  }
});

// Get all public applications for marketplace (only is_public = true)
router.get('/marketplace', async (ctx: Context) => {
  try {
    console.log('🔍 Fetching marketplace apps...');
    
    const rows = await db('generated_apps')
      .where('generated_apps.is_public', true)
      .select(
        'generated_apps.*',
        db.raw('requirements.title as requirement_title'),
        db.raw('users.username as username')
      )
      .leftJoin('requirements', function() {
        this.on('generated_apps.requirement_id', '=', 'requirements.id');
      })
      .leftJoin('users', function() {
        this.on('generated_apps.created_by', '=', 'users.id');
      })
      .orderBy('generated_apps.created_at', 'desc');

    const apps = rows.map((a: any) => ({ ...a, access_url: getAccessUrl(a.subdomain) }));

    console.log('✅ Found apps:', apps.length);
    console.log('📋 Apps data:', apps.map((a: any) => ({ id: a.id, name: a.name, status: a.status })));

    ctx.body = {
      success: true,
      data: apps
    };
  } catch (error: any) {
    console.error('❌ Marketplace error:', error);
    console.error('Error stack:', error.stack);
    ctx.status = 500;
    ctx.body = { success: false, message: '获取应用市场失败', error: error.message };
  }
});

// Update app visibility (public/private in square) - creator or admin only
router.patch('/:id/visibility', authenticate, async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    const idNum = parseInt(String(appId), 10);
    if (Number.isNaN(idNum)) {
      ctx.status = 400;
      ctx.body = { success: false, message: '无效的应用 ID' };
      return;
    }
    const { is_public } = ctx.request.body as { is_public?: boolean };
    if (typeof is_public !== 'boolean') {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少 is_public 参数（boolean）' };
      return;
    }
    const app = await db('generated_apps').where('id', idNum).first();
    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在' };
      return;
    }
    const isCreator = app.created_by === ctx.state.user.id;
    const isAdmin = ctx.state.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      ctx.status = 403;
      ctx.body = { success: false, message: '仅创建者或管理员可修改可见性' };
      return;
    }
    await db('generated_apps').where('id', idNum).update({ is_public: !!is_public });
    ctx.body = { success: true, data: { id: idNum, is_public: !!is_public } };
  } catch (error: any) {
    console.error('Visibility update error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '更新失败' };
  }
});

// 重置卡住的应用状态（仅创建者或管理员，用于「生成中」「部署中」长时间无更新时手动恢复）
router.patch('/:id/status', authenticate, async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    const idNum = parseInt(String(appId), 10);
    if (Number.isNaN(idNum)) {
      ctx.status = 400;
      ctx.body = { success: false, message: '无效的应用 ID' };
      return;
    }
    const { status: newStatus } = ctx.request.body as { status?: string };
    const allowed = ['ready', 'error', 'running'];
    if (!newStatus || !allowed.includes(newStatus)) {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少或无效的 status，允许: ready | error | running' };
      return;
    }
    const app = await db('generated_apps').where('id', idNum).first();
    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在' };
      return;
    }
    const isCreator = app.created_by === ctx.state.user.id;
    const isAdmin = ctx.state.user.role === 'admin';
    if (!isCreator && !isAdmin) {
      ctx.status = 403;
      ctx.body = { success: false, message: '仅创建者或管理员可重置状态' };
      return;
    }
    const current = app.status as string;
    const allowedFrom = ['generating', 'deploying'];
    if (!allowedFrom.includes(current)) {
      ctx.status = 400;
      ctx.body = { success: false, message: '当前仅支持从「生成中」或「部署中」重置状态' };
      return;
    }
    await db('generated_apps').where('id', idNum).update({
      status: newStatus,
      updated_at: new Date(),
    });
    ctx.body = { success: true, data: { id: idNum, status: newStatus } };
  } catch (error: any) {
    console.error('Status reset error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '重置失败' };
  }
});

// Download source code (for marketplace) - 返回下载链接
router.get('/:id/download-source', async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在' };
      return;
    }

    if (app.status !== 'ready') {
      ctx.status = 400;
      ctx.body = { success: false, message: '应用尚未生成完成' };
      return;
    }

    // 获取源码下载链接（通过后端代理）
    const downloadUrl = await forgeEngineService.getSourceDownloadUrl(appId);
    
    if (!downloadUrl) {
      ctx.status = 404;
      ctx.body = { success: false, message: '源码包不可用' };
      return;
    }

    ctx.body = {
      success: true,
      data: {
        download_url: downloadUrl,
        filename: app.source_file_name || `${app.name}-source.zip`
      }
    };
  } catch (error: any) {
    console.error('Source download error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '获取下载链接失败: ' + error.message };
  }
});

// Download source code file - 直接从文件系统读取文件
router.get('/:id/download-file', async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在' };
      return;
    }

    if (app.status !== 'ready' || !app.source_file_name) {
      ctx.status = 400;
      ctx.body = { success: false, message: '应用尚未生成完成或文件不可用' };
      return;
    }

    // 从文件系统直接读取文件（不再通过 HTTP 请求）
    // 获取导出目录（与 forge 配置保持一致）
    const exportDir = process.env.FORGE_EXPORT_DIR || '/tmp/forge-exports';
    const filePath = path.join(exportDir, app.source_file_name);

    console.log(`📥 Reading file from filesystem: ${filePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      ctx.status = 404;
      ctx.body = { success: false, message: '文件不存在' };
      return;
    }

    // 获取文件信息
    const stats = fs.statSync(filePath);
    
    // 设置响应头
    ctx.set('Content-Type', 'application/zip');
    ctx.set('Content-Disposition', `attachment; filename="${app.source_file_name}"`);
    ctx.set('Content-Length', stats.size.toString());

    // 流式传输文件内容
    ctx.body = fs.createReadStream(filePath);
    
  } catch (error: any) {
    console.error('File download error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '文件下载失败: ' + error.message };
  }
});

// 新增：下载应用源码（旧接口，保留兼容性）
router.get('/:id/download', async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .where('status', 'running')
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在或未上线' };
      return;
    }

    console.log(`📦 Exporting source code for app ${appId}`);

    // 调用Forge导出服务
    const exportResult = await fetch(`${process.env.FORGE_EXPORT_URL || 'http://forge-export:8081'}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_name: app.name,
        format: 'zip',
        include_dependencies: true
      })
    });

    if (!exportResult.ok) {
      throw new Error(`Export service error: ${exportResult.statusText}`);
    }

    const exportData = await exportResult.json() as any;
    
    if (exportData.success && exportData.download_url) {
      ctx.body = {
        success: true,
        data: {
          download_url: exportData.download_url,
          filename: `${app.name}-source.zip`,
          size: exportData.size || 'unknown'
        }
      };
    } else {
      throw new Error('Export failed: ' + (exportData.message || 'Unknown error'));
    }
  } catch (error: any) {
    console.error('Source code export error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '源码导出失败: ' + error.message };
  }
});

// 新增：获取导出状态
router.get('/:id/export-status', async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在' };
      return;
    }

    // 检查导出服务状态
    const statusResult = await fetch(`${process.env.FORGE_EXPORT_URL || 'http://forge-export:8081'}/status/${app.name}`);
    
    if (statusResult.ok) {
      const statusData = await statusResult.json() as any;
      ctx.body = {
        success: true,
        data: statusData
      };
    } else {
      ctx.body = {
        success: true,
        data: { status: 'ready', message: '可以导出' }
      };
    }
  } catch (error: any) {
    console.error('Export status check error:', error);
    ctx.body = {
      success: true,
      data: { status: 'ready', message: '可以导出' }
    };
  }
});

// Get application logs
router.get('/:id/logs', authenticate, async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .where('created_by', ctx.state.user.id)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在或无权限' };
      return;
    }

    const deployment = await db('app_deployments')
      .where('app_id', appId)
      .orderBy('created_at', 'desc')
      .first();

    let logs = '暂无日志';
    if (deployment?.docker_container_id) {
      try {
        logs = await dockerService.getContainerLogs(deployment.docker_container_id);
      } catch (error) {
        logs = '获取日志失败: ' + error;
      }
    }

    ctx.body = {
      success: true,
      data: { logs }
    };
  } catch (error: any) {
    console.error('Get logs error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '获取日志失败' };
  }
});

// Restart application
router.post('/:id/restart', authenticate, async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .where('created_by', ctx.state.user.id)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在或无权限' };
      return;
    }

    const deployment = await db('app_deployments')
      .where('app_id', appId)
      .orderBy('created_at', 'desc')
      .first();

    if (!deployment?.docker_container_id) {
      ctx.status = 400;
      ctx.body = { success: false, message: '应用未部署' };
      return;
    }

    // Restart container
    await dockerService.stopContainer(deployment.docker_container_id);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    // Start new container
    const result = await dockerService.deployApplication(app.name, app.subdomain);
    
    // Update deployment record
    await db('app_deployments')
      .where('id', deployment.id)
      .update({
        docker_container_id: result.containerId,
        port: result.port,
        status: 'running'
      });

    await db('generated_apps')
      .where('id', appId)
      .update({ status: 'running' });

    ctx.body = {
      success: true,
      data: { message: '应用重启成功' }
    };
  } catch (error: any) {
    console.error('Restart error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '重启失败' };
  }
});

// Stop application
router.post('/:id/stop', authenticate, async (ctx: Context) => {
  try {
    const appId = ctx.params.id;
    
    const app = await db('generated_apps')
      .where('id', appId)
      .where('created_by', ctx.state.user.id)
      .first();

    if (!app) {
      ctx.status = 404;
      ctx.body = { success: false, message: '应用不存在或无权限' };
      return;
    }

    const deployment = await db('app_deployments')
      .where('app_id', appId)
      .orderBy('created_at', 'desc')
      .first();

    if (!deployment?.docker_container_id) {
      ctx.status = 400;
      ctx.body = { success: false, message: '应用未部署' };
      return;
    }

    // Stop container
    await dockerService.stopContainer(deployment.docker_container_id);
    
    // Update status
    await db('app_deployments')
      .where('id', deployment.id)
      .update({ status: 'stopped' });

    await db('generated_apps')
      .where('id', appId)
      .update({ status: 'stopped' });

    ctx.body = {
      success: true,
      data: { message: '应用已停止' }
    };
  } catch (error: any) {
    console.error('Stop error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '停止失败' };
  }
});

export default router;
