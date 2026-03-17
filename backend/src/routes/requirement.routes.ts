import Router from '@koa/router';
import { RequirementService } from '../services/requirement.service';
import { AppTemplateService } from '../services/app-template.service';
import { PromptTemplateService } from '../services/prompt-template.service';
import { SpecGeneratorService } from '../services/spec-generator.service';
import { prototypeService } from '../services/prototype.service';
import { captureFromHtml } from '../services/screenshot.service';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api/requirements' });
const requirementService = new RequirementService();
const appTemplateService = new AppTemplateService();
const promptTemplateService = new PromptTemplateService();
const specGenerator = new SpecGeneratorService(appTemplateService, promptTemplateService);

router.get('/app-templates', async (ctx) => {
  try {
    const list = await appTemplateService.list({ activeOnly: true });
    ctx.body = { data: list };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/prompt-templates', async (ctx) => {
  try {
    const dimension = ctx.query.dimension as string | undefined;
    const list = await promptTemplateService.list({ dimension, activeOnly: true });
    ctx.body = { data: list };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/', async (ctx) => {
  try {
    const { status, limit, offset } = ctx.query;
    const { requirements, total } = await requirementService.getList({
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    ctx.body = { requirements, total };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

/** 组合后的 Spec 预览：与「AI 生成应用」时发给 AI 的 prompt 一致（不含当次 devPlan）。须在 /:id 之前注册以便匹配 /:id/spec-preview */
router.get('/:id/spec-preview', async (ctx) => {
  try {
    const requirement = await requirementService.getById(ctx.params.id);
    if (!requirement) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '资源不存在' };
      return;
    }
    const spec = await specGenerator.buildPromptFromRequirement({
      title: requirement.title,
      description: requirement.description,
      scene: requirement.scene,
      pain: requirement.pain,
      features: requirement.features,
      extra: requirement.extra,
      app_template_id: requirement.app_template_id,
      prompt_template_ids: requirement.prompt_template_ids,
    });
    ctx.body = { spec: spec ?? '', hasTemplateOrPrompts: !!spec };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/:id', async (ctx) => {
  try {
    const userId = ctx.state.user?.id;
    const requirement = await requirementService.getById(ctx.params.id, userId);
    if (!requirement) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: '资源不存在' };
      return;
    }
    ctx.body = { requirement };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.post('/', authenticate, async (ctx) => {
  try {
    const { title, description, scene, pain, features, extra, category, contact_info, app_template_id, prompt_template_ids } = ctx.request.body as any;
    const result = await requirementService.create({
      title,
      description,
      scene,
      pain,
      features,
      extra,
      category,
      contact_info,
      submitter_id: ctx.state.user.id,
      app_template_id: app_template_id || null,
      prompt_template_ids: prompt_template_ids && typeof prompt_template_ids === 'object' ? prompt_template_ids : null,
    });
    const requirementId = result.requirement.id;
    setImmediate(async () => {
      try {
        const gen = await prototypeService.generate(requirementId);
        if (gen.html) {
          const screenshotUrl = await captureFromHtml(gen.html, requirementId);
          await requirementService.updatePrototypeScreenshot(requirementId, screenshotUrl);
        }
      } catch (err: any) {
        console.error('[create] async prototype+screenshot failed:', err?.message);
      }
    });
    ctx.status = 201;
    ctx.body = {
      requirement: result.requirement,
      moderationRejected: result.moderationRejected,
      moderationRejectReason: result.moderationRejectReason,
    };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: error.message };
  }
});

router.post('/:id/approve', authenticate, requireAdmin, async (ctx) => {
  try {
    const requirement = await requirementService.approve(ctx.params.id, ctx.state.user.id);
    ctx.body = { requirement };
  } catch (error: any) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: error.message };
  }
});

router.post('/:id/reject', authenticate, requireAdmin, async (ctx) => {
  try {
    const requirement = await requirementService.reject(ctx.params.id, ctx.state.user.id);
    ctx.body = { requirement };
  } catch (error: any) {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: error.message };
  }
});

router.post('/:id/status', authenticate, requireAdmin, async (ctx) => {
  try {
    const { status, assigned_to, assigned_to_type } = ctx.request.body as any;
    const requirement = await requirementService.updateStatus(ctx.params.id, status, ctx.state.user.id, assigned_to, assigned_to_type);
    ctx.body = { requirement };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: error.message };
  }
});

export default router;
