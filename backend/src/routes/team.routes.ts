import Router from '@koa/router';
import { Context } from 'koa';
import { authenticate } from '../middleware/auth.middleware';
import * as teamService from '../services/team.service';

const router = new Router();

router.post('/teams', authenticate, async (ctx: Context) => {
  try {
    const { name } = ctx.request.body as { name?: string };
    if (!name?.trim()) {
      ctx.status = 400;
      ctx.body = { success: false, message: '团队名称必填' };
      return;
    }
    const { id } = await teamService.createTeam(ctx.state.user.id, name.trim());
    ctx.body = { success: true, data: { id } };
  } catch (e: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: e?.message || '创建失败' };
  }
});

router.get('/teams', authenticate, async (ctx: Context) => {
  try {
    const list = await teamService.getTeamsForUser(ctx.state.user.id);
    ctx.body = { success: true, data: list };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '获取失败' };
  }
});

router.post('/teams/:teamId/invite', authenticate, async (ctx: Context) => {
  try {
    const { teamId } = ctx.params;
    const { userId, role } = ctx.request.body as { userId?: string; role?: 'admin' | 'member' };
    if (!userId) {
      ctx.status = 400;
      ctx.body = { success: false, message: 'userId 必填' };
      return;
    }
    await teamService.inviteMember(teamId, ctx.state.user.id, userId, role || 'member');
    ctx.body = { success: true };
  } catch (e: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: e?.message || '邀请失败' };
  }
});

router.put('/teams/:teamId/quota', authenticate, async (ctx: Context) => {
  try {
    const { teamId } = ctx.params;
    const { codeGenPool } = ctx.request.body as { codeGenPool?: number };
    if (typeof codeGenPool !== 'number' || codeGenPool < 0) {
      ctx.status = 400;
      ctx.body = { success: false, message: 'codeGenPool 为非负整数' };
      return;
    }
    await teamService.setTeamQuota(teamId, ctx.state.user.id, codeGenPool);
    ctx.body = { success: true };
  } catch (e: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: e?.message || '设置失败' };
  }
});

export default router;
