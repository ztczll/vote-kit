import Router from '@koa/router';
import { Context } from 'koa';
import { DevPlanService } from '../services/dev-plan.service';
import { DevLogService } from '../services/dev-log.service';
import { BetaTestService } from '../services/beta-test.service';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import db from '../database/db';

const router = new Router({ prefix: '/api/requirements/:requirementId' });
const devPlanService = new DevPlanService();
const devLogService = new DevLogService();
const betaTestService = new BetaTestService();

// ========== 开发计划相关 ==========

// 获取开发计划
router.get('/dev-plan', async (ctx: Context) => {
  const { requirementId } = ctx.params;
  try {
    const plan = await devPlanService.getPlanByRequirement(requirementId);
    
    // 如果用户已登录，获取用户的投票记录
    let userVotes = {};
    if (ctx.state.user && plan) {
      userVotes = await devPlanService.getUserVotes(plan.id, ctx.state.user.id);
    }
    
    ctx.body = { success: true, data: { plan, userVotes } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

// 创建/更新开发计划（登录用户）
router.post('/dev-plan', authenticate, async (ctx: Context) => {
  const { requirementId } = ctx.params;
  const { features } = ctx.request.body as { features: Array<{ title: string; description: string }> };
  
  try {
    let plan = await devPlanService.getPlanByRequirement(requirementId);
    if (!plan) {
      plan = await devPlanService.createPlan(requirementId);
    }
    await db('plan_features').where({ plan_id: plan.id }).delete();
    for (let i = 0; i < features.length; i++) {
      await devPlanService.addFeature(plan.id, features[i].title, features[i].description, i);
    }
    ctx.body = { success: true, data: { plan } };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

// 投票（用户）
router.post('/features/:featureId/vote', authenticate, async (ctx: Context) => {
  const { featureId } = ctx.params;
  const { voteType } = ctx.request.body as { voteType: 'must_have' | 'nice_to_have' };
  const userId = ctx.state.user.id;
  
  try {
    await devPlanService.voteFeature(featureId, userId, voteType);
    ctx.body = { success: true, message: '投票成功' };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

// ========== 开发日志相关 ==========

// 获取日志列表
router.get('/dev-logs', async (ctx: Context) => {
  const { requirementId } = ctx.params;
  try {
    const logs = await devLogService.getLogs(requirementId);
    
    // 如果用户已登录，获取用户的点赞记录
    let userLikes: string[] = [];
    if (ctx.state.user) {
      userLikes = await devLogService.getUserLikes(requirementId, ctx.state.user.id);
    }
    
    ctx.body = { success: true, data: { logs, userLikes } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

// 发布日志（登录用户）
router.post('/dev-logs', authenticate, async (ctx: Context) => {
  const { requirementId } = ctx.params;
  const { title, content, logType } = ctx.request.body as { title: string; content: string; logType: string };
  const authorId = ctx.state.user.id;
  
  try {
    const log = await devLogService.createLog(requirementId, authorId, title, content, logType);
    ctx.body = { success: true, data: { log } };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

// 点赞日志（用户）
router.post('/dev-logs/:logId/like', authenticate, async (ctx: Context) => {
  const { logId } = ctx.params;
  const userId = ctx.state.user.id;
  
  try {
    await devLogService.likeLog(logId, userId);
    ctx.body = { success: true, message: '点赞成功' };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

// 取消点赞（用户）
router.delete('/dev-logs/:logId/like', authenticate, async (ctx: Context) => {
  const { logId } = ctx.params;
  const userId = ctx.state.user.id;
  
  try {
    await devLogService.unlikeLog(logId, userId);
    ctx.body = { success: true, message: '取消点赞成功' };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

// 添加评论（用户）
router.post('/dev-logs/:logId/comments', authenticate, async (ctx: Context) => {
  const { logId } = ctx.params;
  const { content } = ctx.request.body as { content: string };
  const userId = ctx.state.user.id;
  
  try {
    await devLogService.addComment(logId, userId, content);
    ctx.body = { success: true, message: '评论成功' };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

// 获取评论
router.get('/dev-logs/:logId/comments', async (ctx: Context) => {
  const { logId } = ctx.params;
  
  try {
    const comments = await devLogService.getComments(logId);
    ctx.body = { success: true, data: { comments } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

// ========== 内测申请相关 ==========

// 获取内测信息
router.get('/beta-test', async (ctx: Context) => {
  const { requirementId } = ctx.params;
  
  try {
    const approvedCount = await betaTestService.getApprovedCount(requirementId);
    ctx.body = { success: true, data: { approvedCount } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

// 申请内测（用户）
router.post('/beta-test/apply', authenticate, async (ctx: Context) => {
  const { requirementId } = ctx.params;
  const { email, deviceType, availableHours } = ctx.request.body as any;
  const userId = ctx.state.user.id;
  
  try {
    await betaTestService.applyBeta(requirementId, userId, email, deviceType, availableHours);
    ctx.body = { success: true, message: '申请成功' };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

// 获取我的申请状态
router.get('/beta-test/my-application', authenticate, async (ctx: Context) => {
  const { requirementId } = ctx.params;
  const userId = ctx.state.user.id;
  
  try {
    const application = await betaTestService.getMyApplication(requirementId, userId);
    ctx.body = { success: true, data: { application } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

// 获取申请列表（管理员）
router.get('/beta-test/applications', authenticate, requireAdmin, async (ctx: Context) => {
  const { requirementId } = ctx.params;
  
  try {
    const applications = await betaTestService.getApplications(requirementId);
    ctx.body = { success: true, data: { applications } };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: error.message };
  }
});

// 自动审批（管理员）
router.post('/beta-test/auto-approve', authenticate, requireAdmin, async (ctx: Context) => {
  const { requirementId } = ctx.params;
  const { limit } = ctx.request.body as { limit?: number };
  
  try {
    const count = await betaTestService.autoApprove(requirementId, limit || 20);
    ctx.body = { success: true, message: `已审批 ${count} 个申请` };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: error.message };
  }
});

export default router;
