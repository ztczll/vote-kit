import Router from '@koa/router';
import * as fs from 'fs';
import { Context } from 'koa';
import { authenticate } from '../middleware/auth.middleware';
import { getPrototypeArtifactPath, prototypeService } from '../services/prototype.service';
import { listVersions } from '../services/prototype-workspace.service';
import { checkQuota, deductQuota } from '../services/plan.service';
import { checkAndIncrementIpLimit } from '../services/rate-limit.service';
import { getScreenshotPath } from '../services/screenshot.service';

const router = new Router();

// 存储异步生成任务状态
const taskStatus = new Map<string, { status: 'pending' | 'success' | 'error'; result?: any; error?: string }>();

/**
 * POST /api/prototype/generate
 * Body: { requirementId: string }
 * Returns: { success, taskId }
 */
router.post('/generate', authenticate, async (ctx: Context) => {
  try {
    const { requirementId } = ctx.request.body as { requirementId?: string };
    if (!requirementId) {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少 requirementId' };
      return;
    }

    const userId = ctx.state.user.id;
    const ip = ctx.request.ip || ctx.ip || '';
    const ipLimit = await checkAndIncrementIpLimit(ip, 'proto');
    if (!ipLimit.allowed) {
      ctx.status = 429;
      ctx.body = { success: false, message: ipLimit.message, code: 'RATE_LIMIT' };
      return;
    }
    const quota = await checkQuota(userId, 'requirement_prototype');
    if (!quota.allowed) {
      ctx.status = 403;
      ctx.body = { success: false, message: quota.message || '额度不足', code: 'QUOTA_EXCEEDED' };
      return;
    }

    const taskId = `${requirementId}-${Date.now()}`;
    taskStatus.set(taskId, { status: 'pending' });

    prototypeService.generate(requirementId, undefined, userId).then(async (result) => {
      await deductQuota(userId, 'requirement_prototype');
      taskStatus.set(taskId, { status: 'success', result });
      setTimeout(() => taskStatus.delete(taskId), 300000);
    }).catch(err => {
      taskStatus.set(taskId, { status: 'error', error: err.message });
      setTimeout(() => taskStatus.delete(taskId), 300000);
    });

    ctx.body = { success: true, taskId };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: err.message || '任务创建失败' };
  }
});

/**
 * GET /api/prototype/status/:taskId
 * Returns: { success, status, data?, error? }
 */
router.get('/status/:taskId', authenticate, async (ctx: Context) => {
  const { taskId } = ctx.params;
  const task = taskStatus.get(taskId);
  
  if (!task) {
    ctx.status = 404;
    ctx.body = { success: false, message: '任务不存在或已过期' };
    return;
  }
  
  ctx.body = {
    success: true,
    status: task.status,
    data: task.result,
    error: task.error
  };
});

/**
 * GET /api/prototype/screenshot/:requirementId
 * Serves the prototype screenshot image (no auth, currently WEBP).
 */
router.get('/screenshot/:requirementId', async (ctx: Context) => {
  const requirementId = ctx.params.requirementId;
  const filePath = getScreenshotPath(requirementId);
  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.body = { success: false, message: '截图不存在' };
    return;
  }
  ctx.type = 'image/webp';
  ctx.body = fs.createReadStream(filePath);
});

/**
 * GET /api/prototype/artifacts/:requirementId
 * Serves the saved prototype HTML (no auth).
 * Query: ?version=N to serve that version; omit for latest.
 * Used by Forge/Kiro/Cursor to fetch the prototype as a reference URL.
 */
router.get('/artifacts/:requirementId', async (ctx: Context) => {
  const requirementId = ctx.params.requirementId;
  const versionParam = ctx.query.version as string | undefined;
  const version = versionParam ? parseInt(versionParam, 10) : undefined;
  const filePath = getPrototypeArtifactPath(requirementId, version);
  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.body = { success: false, message: '原型文件不存在' };
    return;
  }
  ctx.type = 'html';
  ctx.body = fs.readFileSync(filePath, 'utf8');
});

/**
 * GET /api/prototype/artifacts/:requirementId/versions
 * Returns list of saved versions for the requirement (newest first, max 2).
 */
router.get('/artifacts/:requirementId/versions', async (ctx: Context) => {
  const requirementId = ctx.params.requirementId;
  const versions = listVersions(requirementId).slice(0, 2);
  ctx.body = { success: true, data: { versions } };
});

/**
 * POST /api/prototype/regenerate
 * Body: { requirementId: string, feedback: string }
 * Returns: { success, taskId }
 */
router.post('/regenerate', authenticate, async (ctx: Context) => {
  try {
    const { requirementId, feedback } = ctx.request.body as { requirementId?: string; feedback?: string };
    if (!requirementId) {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少 requirementId' };
      return;
    }

    const userId = ctx.state.user.id;
    const ip = ctx.request.ip || ctx.ip || '';
    const ipLimit = await checkAndIncrementIpLimit(ip, 'proto');
    if (!ipLimit.allowed) {
      ctx.status = 429;
      ctx.body = { success: false, message: ipLimit.message, code: 'RATE_LIMIT' };
      return;
    }
    const quota = await checkQuota(userId, 'requirement_prototype');
    if (!quota.allowed) {
      ctx.status = 403;
      ctx.body = { success: false, message: quota.message || '额度不足', code: 'QUOTA_EXCEEDED' };
      return;
    }

    const taskId = `${requirementId}-${Date.now()}`;
    taskStatus.set(taskId, { status: 'pending' });

    prototypeService.generate(requirementId, feedback || '', userId).then(async (result) => {
      await deductQuota(userId, 'requirement_prototype');
      taskStatus.set(taskId, { status: 'success', result });
      setTimeout(() => taskStatus.delete(taskId), 300000);
    }).catch(err => {
      taskStatus.set(taskId, { status: 'error', error: err.message });
      setTimeout(() => taskStatus.delete(taskId), 300000);
    });

    ctx.body = { success: true, taskId };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: err.message || '任务创建失败' };
  }
});

export default router;
