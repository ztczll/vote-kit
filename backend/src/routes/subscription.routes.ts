import Router from '@koa/router';
import { Context } from 'koa';
import { authenticate } from '../middleware/auth.middleware';
import * as subscriptionService from '../services/subscription.service';
import db from '../database/db';
import { getUserCreditsBalance } from '../services/credits.service';

const router = new Router();

router.get('/plans', async (ctx: Context) => {
  try {
    const plans = await subscriptionService.getPlansForDisplay();
    ctx.body = { success: true, data: plans };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '获取套餐失败' };
  }
});

router.get('/usage', authenticate, async (ctx: Context) => {
  try {
    const { getUserPlan, ensureUserUsageRow } = await import('../services/plan.service');
    const userId = ctx.state.user.id;
    const { plan, planExpiresAt } = await getUserPlan(userId);
    const usage = await ensureUserUsageRow(userId);
    const creditsRemaining = await getUserCreditsBalance(userId);
    // 暂无精细「已用」统计，这里按当前余额展示，展示上视为「本月额度 = 当前余额」
    const creditsLimit = creditsRemaining > 0 ? creditsRemaining : 0;
    const creditsUsed = 0;

    let recentConsumption: Array<{
      taskId: string;
      createdAt: string;
      taskType: string;
      taskLabel: string;
      credits: number;
      status: string;
    }> = [];
    try {
      const limit = Math.min(5, parseInt(String(ctx.query.recentLimit), 10) || 5);
      const recentRows = await db('credits_transactions')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit);

      recentConsumption = recentRows.map((r: any) => {
        const delta = Number(r.credits_delta ?? 0);
        const abs = Math.abs(delta);
        let taskType = '变动';
        let taskLabel = '';

        switch (r.source) {
          case 'deepseek':
            taskType = '原型/文档生成';
            taskLabel = 'DeepSeek 调用';
            break;
          case 'kiro':
            taskType = '完整代码生成';
            taskLabel = 'Kiro 代码生成';
            break;
          case 'welcome':
            taskType = '系统赠送';
            taskLabel = '新用户欢迎赠送';
            break;
          case 'topup':
            taskType = '加油包';
            taskLabel = '购买 Credits 加油包';
            break;
          case 'admin_adjust':
            taskType = '管理员调整';
            taskLabel = '后台手动调整';
            break;
          default:
            taskType = r.source || '变动';
            taskLabel = 'Credits 变动';
        }

        const status = delta < 0 ? 'completed' : 'received';

        return {
          taskId: r.id || `${r.user_id}-${r.created_at}`,
          createdAt: r.created_at,
          taskType,
          taskLabel,
          credits: abs,
          status,
        };
      });
    } catch {
      recentConsumption = [];
    }

    ctx.body = {
      success: true,
      data: {
        plan,
        planExpiresAt: planExpiresAt?.toISOString() ?? null,
        resetLabel: '每月 1 日重置',
        // 次数信息仅作统计用途，前端当前未直接使用
        requirementPrototypeCount: usage.requirementPrototypeCount,
        codeGenerationCount: usage.codeGenerationCount,
        creditsUsed,
        creditsLimit: creditsLimit || 1,
        creditsRemaining,
        recentConsumption,
      },
    };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: e?.message || '获取用量失败' };
  }
});

router.post('/create-order', authenticate, async (ctx: Context) => {
  try {
    const { plan, provider } = ctx.request.body as { plan?: string; provider?: 'alipay' | 'wechat' };
    if (!plan || !['pro', 'pro_plus'].includes(plan)) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请选择 Pro 或 Pro+ 套餐' };
      return;
    }
    const userId = ctx.state.user.id;
    const result = await subscriptionService.createOrder(userId, plan as 'pro' | 'pro_plus', provider || 'alipay');
    ctx.body = { success: true, data: result };
  } catch (e: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: e?.message || '创建订单失败' };
  }
});

// 购买 Credits 加油包（当前版本：直接入账 Credits，不接入第三方支付）
router.post('/topup', authenticate, async (ctx: Context) => {
  try {
    const { pkg } = ctx.request.body as { pkg?: 'starter' | 'pro' | 'team' | string };
    const userId = ctx.state.user.id;

    // 内测阶段的固定加油包：可根据你的表格调整
    const packages: Record<string, { credits: number; priceCents: number }> = {
      starter: { credits: 500, priceCents: 600 },   // 入门包：500 Credits，¥6
      pro: { credits: 2000, priceCents: 2000 },     // 专业包：2000 Credits，¥20
      team: { credits: 8000, priceCents: 7200 },    // 团队包：8000 Credits，¥72
    };

    const key = (pkg || '').toLowerCase();
    const selected = packages[key];
    if (!selected) {
      ctx.status = 400;
      ctx.body = { success: false, message: '无效的加油包类型', code: 'INVALID_TOPUP_PACKAGE' };
      return;
    }

    const result = await subscriptionService.applyCreditsTopup(userId, selected.credits, key);
    ctx.body = { success: true, data: { pkg: key, credits: result.credits } };
  } catch (e: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: e?.message || '加油包购买失败' };
  }
});

router.post('/callback', async (ctx: Context) => {
  try {
    const { orderId, status, transactionId } = ctx.request.body as { orderId?: string; status?: string; transactionId?: string };
    if (!orderId || !status) {
      ctx.status = 400;
      ctx.body = { success: false, message: '缺少 orderId 或 status' };
      return;
    }
    if (status !== 'paid' && status !== 'failed') {
      ctx.status = 400;
      ctx.body = { success: false, message: '无效的 status' };
      return;
    }
    await subscriptionService.handlePaymentCallback(orderId, status, transactionId);
    ctx.body = { success: true };
  } catch (e: any) {
    ctx.status = 400;
    ctx.body = { success: false, message: e?.message || '回调处理失败' };
  }
});

export default router;
