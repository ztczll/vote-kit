import Router from '@koa/router';
import multer from '@koa/multer';
import path from 'path';
import fs from 'fs';
import { AdminService } from '../services/admin.service';
import { RequirementService } from '../services/requirement.service';
import { AppTemplateService } from '../services/app-template.service';
import { PromptTemplateService } from '../services/prompt-template.service';
import { dataMigrationService } from '../services/data-migration.service';
import { aiMonitoringService } from '../services/ai-monitoring.service';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import db from '../config/database';

const uploadsContactDir = path.join('uploads', 'contact');
const uploadWechatQr = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        fs.mkdirSync(uploadsContactDir, { recursive: true });
        cb(null, uploadsContactDir);
      } catch (err) {
        cb(err as Error, uploadsContactDir);
      }
    },
    filename: (_req, _file, cb) => cb(null, 'wechat-qr.png'),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^image\/(png|jpeg|jpg|webp)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('仅支持图片格式 PNG/JPG/WebP') as any, false);
  },
});

const router = new Router({ prefix: '/api/admin' });
const adminService = new AdminService();
const requirementService = new RequirementService();
const appTemplateService = new AppTemplateService();
const promptTemplateService = new PromptTemplateService();

router.get('/dashboard', authenticate, requireAdmin, async (ctx) => {
  try {
    const dashboard = await adminService.getDashboard();
    ctx.body = dashboard;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/requirements/pending', authenticate, requireAdmin, async (ctx) => {
  try {
    const requirements = await adminService.getPendingRequirements();
    ctx.body = { requirements };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/requirements/ai-rejected', authenticate, requireAdmin, async (ctx) => {
  try {
    const requirements = await adminService.getAiRejectedRequirements();
    ctx.body = { requirements };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/requirements/active', authenticate, requireAdmin, async (ctx) => {
  try {
    const requirements = await adminService.getActiveRequirements();
    ctx.body = { requirements };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.delete('/requirements/:id', authenticate, requireAdmin, async (ctx) => {
  try {
    const deleted = await requirementService.delete(ctx.params.id);
    if (!deleted) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '需求不存在' };
      return;
    }
    ctx.status = 204;
    ctx.body = null;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/users', authenticate, requireAdmin, async (ctx) => {
  try {
    const plan = ctx.query.plan as string | undefined;
    const page = Math.max(1, parseInt(String(ctx.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(10, parseInt(String(ctx.query.pageSize), 10) || 20));
    const result = await adminService.getUsersForSupport({ plan, page, pageSize });
    ctx.body = result;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/queue-status', authenticate, requireAdmin, async (ctx) => {
  try {
    const { forgeEngineService } = await import('../services/forge-engine.service');
    const queueLengths = await forgeEngineService.getQueueLengths();
    let genTasksByStatus: Record<string, number> = {};
    try {
      const rows = await db('gen_tasks').select('status').count('* as count').groupBy('status');
      genTasksByStatus = rows.reduce((acc: Record<string, number>, r: any) => {
        acc[r.status] = r.count;
        return acc;
      }, {});
    } catch {
      // gen_tasks may not exist
    }
    ctx.body = { success: true, data: { queue: queueLengths, genTasks: genTasksByStatus } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/health', authenticate, requireAdmin, async (ctx) => {
  try {
    const redis = (await import('../config/redis')).default;
    const dbOk = true;
    let redisOk = false;
    try {
      await redis.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
    ctx.body = { success: true, data: { db: dbOk, redis: redisOk } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, data: { db: false, redis: false } };
  }
});

router.put('/users/:userId/quota', authenticate, requireAdmin, async (ctx) => {
  try {
    const { userId } = ctx.params;
    const body = ctx.request.body as { creditsDelta?: number };
    await adminService.adjustUserQuota(userId, body);
    ctx.body = { success: true };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { error: 'BAD_REQUEST', message: error.message };
  }
});

// --- App templates (Admin CRUD) ---
router.get('/app-templates', authenticate, requireAdmin, async (ctx) => {
  try {
    const activeOnly = ctx.query.activeOnly === 'true';
    const list = await appTemplateService.list({ activeOnly });
    ctx.body = { data: list };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.post('/app-templates', authenticate, requireAdmin, async (ctx) => {
  try {
    const body = ctx.request.body as {
      name: string;
      type_key: string;
      layer1_product_vision?: string | null;
      layer2_functional_spec?: string | null;
      layer3_impl_guidance?: string | null;
      layer4_deployment_spec?: string | null;
      sort_order?: number;
      is_active?: boolean;
      example_requirement_id?: string | null;
    };
    if (!body.name || !body.type_key) {
      ctx.status = 400;
      ctx.body = { error: 'MISSING_PARAMS', message: 'name 和 type_key 必填' };
      return;
    }
    const row = await appTemplateService.create(body);
    ctx.status = 201;
    ctx.body = { data: row };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/app-templates/:id', authenticate, requireAdmin, async (ctx) => {
  try {
    const row = await appTemplateService.getById(ctx.params.id);
    if (!row) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '应用模板不存在' };
      return;
    }
    ctx.body = { data: row };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.put('/app-templates/:id', authenticate, requireAdmin, async (ctx) => {
  try {
    const body = ctx.request.body as Partial<{
      name: string;
      type_key: string;
      layer1_product_vision: string | null;
      layer2_functional_spec: string | null;
      layer3_impl_guidance: string | null;
      layer4_deployment_spec: string | null;
      sort_order: number;
      is_active: boolean;
      example_requirement_id: string | null;
    }>;
    const row = await appTemplateService.update(ctx.params.id, body);
    if (!row) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '应用模板不存在' };
      return;
    }
    ctx.body = { data: row };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.delete('/app-templates/:id', authenticate, requireAdmin, async (ctx) => {
  try {
    const ok = await appTemplateService.delete(ctx.params.id);
    if (!ok) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '应用模板不存在' };
      return;
    }
    ctx.status = 204;
    ctx.body = null;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

// --- Prompt templates (Admin CRUD) ---
router.get('/prompt-templates', authenticate, requireAdmin, async (ctx) => {
  try {
    const dimension = ctx.query.dimension as string | undefined;
    const activeOnly = ctx.query.activeOnly === 'true';
    const list = await promptTemplateService.list({ dimension, activeOnly });
    ctx.body = { data: list };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.post('/prompt-templates', authenticate, requireAdmin, async (ctx) => {
  try {
    const body = ctx.request.body as { dimension: string; title: string; content: string; sort_order?: number; is_active?: boolean };
    if (!body.dimension || !body.title || !body.content) {
      ctx.status = 400;
      ctx.body = { error: 'MISSING_PARAMS', message: 'dimension、title、content 必填' };
      return;
    }
    const row = await promptTemplateService.create(body);
    ctx.status = 201;
    ctx.body = { data: row };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/prompt-templates/:id', authenticate, requireAdmin, async (ctx) => {
  try {
    const row = await promptTemplateService.getById(ctx.params.id);
    if (!row) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '模板提示词不存在' };
      return;
    }
    ctx.body = { data: row };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.put('/prompt-templates/:id', authenticate, requireAdmin, async (ctx) => {
  try {
    const body = ctx.request.body as Partial<{ dimension: string; title: string; content: string; sort_order: number; is_active: boolean }>;
    const row = await promptTemplateService.update(ctx.params.id, body);
    if (!row) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '模板提示词不存在' };
      return;
    }
    ctx.body = { data: row };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.delete('/prompt-templates/:id', authenticate, requireAdmin, async (ctx) => {
  try {
    const ok = await promptTemplateService.delete(ctx.params.id);
    if (!ok) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '模板提示词不存在' };
      return;
    }
    ctx.status = 204;
    ctx.body = null;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

// 数据重新生成API
router.post('/regenerate-requirements', authenticate, requireAdmin, async (ctx) => {
  try {
    const { limit } = ctx.request.body as { limit?: number };
    const result = await dataMigrationService.regenerateRequirements(limit);
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

router.post('/regenerate-dev-plans', authenticate, requireAdmin, async (ctx) => {
  try {
    const { limit } = ctx.request.body as { limit?: number };
    const result = await dataMigrationService.regenerateDevPlans(limit);
    ctx.body = { success: true, data: result };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

router.get('/regeneration-stats', authenticate, requireAdmin, async (ctx) => {
  try {
    const stats = await dataMigrationService.getRegenerationStats();
    ctx.body = { success: true, data: stats };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

router.get('/ai-usage-stats', authenticate, requireAdmin, async (ctx) => {
  try {
    const { days = 7 } = ctx.query;
    const stats = await aiMonitoringService.getUsageStats(Number(days));
    ctx.body = { success: true, data: stats };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

router.get('/ai-billing', authenticate, requireAdmin, async (ctx) => {
  try {
    const status = ctx.query.status as string | undefined;
    const billing_status = ctx.query.billing_status as string | undefined;
    const result = await adminService.getGeneratedAppsBilling(
      status || billing_status ? { status, billing_status } : undefined
    );
    ctx.body = { success: true, data: result.data, summary: result.summary };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

router.get('/plans-config', authenticate, requireAdmin, async (ctx) => {
  try {
    const rows = await db('plans_config').orderBy('price_monthly', 'asc');
    ctx.body = { success: true, data: rows };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '获取失败' };
  }
});

router.put('/plans-config/:plan', authenticate, requireAdmin, async (ctx) => {
  try {
    const { plan } = ctx.params;
    const body = ctx.request.body as { requirement_limit?: number; code_gen_limit?: number; cache_days?: number; price_monthly?: number; queue_priority?: string };
    const allowed = ['requirement_limit', 'code_gen_limit', 'cache_days', 'price_monthly', 'queue_priority'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key as keyof typeof body] !== undefined) updates[key] = body[key as keyof typeof body];
    }
    if (Object.keys(updates).length === 0) {
      ctx.status = 400;
      ctx.body = { success: false, message: '无有效字段' };
      return;
    }
    await db('plans_config').where({ plan }).update(updates);
    const row = await db('plans_config').where({ plan }).first();
    ctx.body = { success: true, data: row };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '更新失败' };
  }
});

router.get('/cost-alert', authenticate, requireAdmin, async (ctx) => {
  try {
    const threshold = Number(ctx.query.threshold) || 10;
    const result = await aiMonitoringService.checkCostAlert(threshold);
    ctx.body = { success: true, data: result };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '获取失败' };
  }
});

// 用户反馈列表（管理端查看）
router.get('/feedback', authenticate, requireAdmin, async (ctx) => {
  try {
    const page = Math.max(1, parseInt(String(ctx.query.page), 10) || 1);
    const pageSize = Math.min(50, Math.max(10, parseInt(String(ctx.query.pageSize), 10) || 20));
    const type = ctx.query.type as string | undefined;
    const status = ctx.query.status as string | undefined;

    let query = db('feedback').orderBy('created_at', 'desc');
    if (type) query = query.where('type', type);
    if (status) query = query.where('status', status);

    const total = await query.clone().count('* as count').first();
    const list = await query
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    ctx.body = {
      success: true,
      data: list,
      total: Number((total as any)?.count ?? 0),
      page,
      pageSize,
    };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '获取失败' };
  }
});

// 反馈与联系配置：微信入群二维码上传
router.post('/settings/wechat-qr', authenticate, requireAdmin, uploadWechatQr.single('file'), async (ctx) => {
  try {
    const file = (ctx.request as any).file;
    if (!file) {
      ctx.status = 400;
      ctx.body = { error: 'MISSING_FILE', message: '请选择图片文件' };
      return;
    }
    const iso = new Date().toISOString();
    const existing = await db('settings').where({ key: 'wechat_group_qr_updated_at' }).first();
    if (existing) {
      await db('settings').where({ key: 'wechat_group_qr_updated_at' }).update({ value: iso, updated_at: db.fn.now() });
    } else {
      await db('settings').insert({ key: 'wechat_group_qr_updated_at', value: iso, updated_at: db.fn.now() });
    }
    ctx.body = { success: true, url: '/api/settings/wechat-qr-image', updated_at: iso };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: e?.message || '上传失败' };
  }
});

router.get('/settings/contact', authenticate, requireAdmin, async (ctx) => {
  try {
    const row = await db('settings').where({ key: 'wechat_group_qr_updated_at' }).first();
    ctx.body = {
      success: true,
      data: {
        wechat_group_qr_url: row ? '/api/settings/wechat-qr-image' : null,
        wechat_group_qr_updated_at: row?.value ?? null,
      },
    };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '获取失败' };
  }
});

export default router;
