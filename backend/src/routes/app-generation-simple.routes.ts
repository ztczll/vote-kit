import Router from '@koa/router';
import { Context } from 'koa';
import { randomUUID } from 'crypto';
import db from '../config/database';
import { authenticate } from '../middleware/auth.middleware';
import { forgeEngineService } from '../services/forge-engine.service';
import { checkQuota, getUserPlan, getPlanLimits } from '../services/plan.service';
import { checkAndIncrementIpLimit, checkAndIncrementUserCodeLimit } from '../services/rate-limit.service';
import { SpecGeneratorService } from '../services/spec-generator.service';
import { AppTemplateService } from '../services/app-template.service';
import { PromptTemplateService } from '../services/prompt-template.service';

const router = new Router();
const specGenerator = new SpecGeneratorService(new AppTemplateService(), new PromptTemplateService());

// Get all public applications for marketplace
router.get('/marketplace', async (ctx: Context) => {
  try {
    // Show all apps (including generating ones) in marketplace
    // Use leftJoin to include apps even if requirement or user is missing
    console.log('🔍 Fetching marketplace apps...');
    
    // First, try a simple query to see if there's any data
    const count = await db('generated_apps').count('* as total').first();
    console.log('📊 Total apps in database:', count);
    
    const apps = await db('generated_apps')
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

    console.log('✅ Found apps:', apps.length);
    console.log('📋 Apps data:', apps.map(a => ({ id: a.id, name: a.name, status: a.status })));

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

// List user's applications
router.get('/my-apps', authenticate, async (ctx: Context) => {
  try {
    const apps = await db('generated_apps')
      .where('created_by', ctx.state.user.id)
      .select(
        'generated_apps.*',
        'tokens_used',
        'cost_cents',
        'billing_status'
      )
      .orderBy('created_at', 'desc');

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

// Generate new application (using Forge Engine)
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

    const { requirementId, devPlan, publishToSquare } = ctx.request.body as {
      requirementId: string;
      devPlan: string;
      publishToSquare?: boolean;
    };

    if (!requirementId || !devPlan) {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少必要参数' };
      return;
    }

    const requirement = await db('requirements').where('id', requirementId).first();
    if (!requirement) {
      ctx.status = 404;
      ctx.body = { success: false, message: '需求不存在' };
      return;
    }

    const timestamp = Date.now();
    const subdomain = `app-${requirementId.substring(0, 8)}-${timestamp}`;
    const uuid = randomUUID();
    const appName = uuid.replace(/-/g, '').substring(0, 8);

    const [appId] = await db('generated_apps').insert({
      requirement_id: requirement.id,
      name: appName,
      description: requirement.description || '基于需求自动生成的应用',
      subdomain,
      status: 'generating',
      created_by: userId,
      is_public: publishToSquare === true
    });

    const planLimits = await getPlanLimits((await getUserPlan(userId)).plan);
    const genTaskId = randomUUID();
    await db('gen_tasks').insert({
      id: genTaskId,
      user_id: userId,
      requirement_id: requirement.id,
      generated_app_id: appId,
      priority: planLimits.queuePriority || 'normal',
      status: 'pending',
    });

    // 构建 AI 提示词：优先使用 Spec（模板+提示词），否则用原有拼接
    let prompt: string;
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
      prompt = specPrompt + (devPlan ? `\n\n## 开发计划\n${devPlan}` : '') + `\n\n应用名称：${appName}`;
    } else {
      prompt = `基于以下需求创建一个完整的Web应用：

需求标题：${requirement.title}
需求描述：${requirement.description || '无详细描述'}

开发计划：
${devPlan}

请生成一个完整的、可运行的Web应用，包括：
1. 前端界面（HTML/CSS/JavaScript）
2. 后端API（Node.js/Express）
3. 数据库设计（如需要）
4. Docker配置
5. 完整的项目结构

应用名称：${appName}`;
    }

    // 提交任务到 Forge Engine（按套餐优先级入队）
    try {
      const taskId = await forgeEngineService.submitTask(
        appId.toString(),
        appName,
        prompt,
        userId,
        requirementId,
        planLimits.queuePriority || 'normal'
      );

      // 保存任务ID
      await db('generated_apps')
        .where('id', appId)
        .update({ forge_task_id: taskId });

      ctx.body = {
        success: true,
        data: { 
          appId, 
          subdomain, 
          status: 'generating',
          taskId,
          message: 'Forge Engine正在生成完整的Web应用，请稍候...' 
        }
      };
    } catch (error: any) {
      // 如果提交失败，更新状态为错误
      await db('generated_apps')
        .where('id', appId)
        .update({ status: 'error', error_message: error.message });
      
      throw error;
    }
  } catch (error: any) {
    console.error('App generation error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '生成失败: ' + error.message };
  }
});

// Deploy application (already deployed during generation)
router.post('/:id/deploy', authenticate, async (ctx: Context) => {
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

    // App is already deployed during generation
    ctx.body = {
      success: true,
      data: {
        id: app.id,
        name: app.name,
        status: app.status,
        deployment_url: app.deployment_url,
        message: '应用已部署完成'
      }
    };
  } catch (error: any) {
    console.error('Deploy error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '部署失败' };
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

    ctx.body = {
      success: true,
      data: {
        id: app.id,
        name: app.name,
        status: app.status,
        subdomain: app.subdomain
      }
    };
  } catch (error: any) {
    console.error('Status check error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '状态查询失败' };
  }
});

// Deploy application (with real deployment)
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

    if (app.status !== 'ready') {
      ctx.status = 400;
      ctx.body = { success: false, message: '应用尚未生成完成' };
      return;
    }

    // Forge Engine 已经完成了部署，直接返回部署信息
    ctx.body = {
      success: true,
      data: { 
        status: 'ready',
        deployment_url: app.deployment_url,
        message: '应用已通过 Forge Engine 成功部署'
      }
    };
  } catch (error: any) {
    console.error('Deployment error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '部署失败: ' + error.message };
  }
});

// Download source code
router.get('/:id/download-source', authenticate, async (ctx: Context) => {
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

    if (app.status !== 'ready') {
      ctx.status = 400;
      ctx.body = { success: false, message: '应用尚未生成完成' };
      return;
    }

    // 获取源码下载链接
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
        file_name: app.source_file_name || `${app.name}-source.zip`
      }
    };
  } catch (error: any) {
    console.error('Source download error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '获取下载链接失败: ' + error.message };
  }
});

export default router;
