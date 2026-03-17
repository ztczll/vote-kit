import db from '../database/db';
import { getUserCreditsBalance } from './credits.service';

export type PlanId = 'free' | 'pro' | 'pro_plus' | 'enterprise';

export interface PlanLimits {
  plan: string;
  requirementLimit: number;
  codeGenLimit: number;
  cacheDays: number;
  priceMonthly: number | null;
  queuePriority: string;
}

const DEFAULT_LIMITS: Record<PlanId, PlanLimits> = {
  free: { plan: 'free', requirementLimit: 5, codeGenLimit: 1, cacheDays: 7, priceMonthly: 0, queuePriority: 'normal' },
  pro: { plan: 'pro', requirementLimit: 50, codeGenLimit: 10, cacheDays: 30, priceMonthly: 2900, queuePriority: 'normal' },
  pro_plus: { plan: 'pro_plus', requirementLimit: 300, codeGenLimit: 50, cacheDays: 90, priceMonthly: 9900, queuePriority: 'priority' },
  enterprise: { plan: 'enterprise', requirementLimit: -1, codeGenLimit: 200, cacheDays: -1, priceMonthly: null, queuePriority: 'dedicated' },
};

export async function getPlanLimits(plan: string): Promise<PlanLimits> {
  const row = await db('plans_config').where({ plan }).first();
  if (row) {
    return {
      plan: row.plan,
      requirementLimit: row.requirement_limit,
      codeGenLimit: row.code_gen_limit,
      cacheDays: row.cache_days,
      priceMonthly: row.price_monthly,
      queuePriority: row.queue_priority || 'normal',
    };
  }
  return DEFAULT_LIMITS[plan as PlanId] ?? DEFAULT_LIMITS.free;
}

export async function getUserPlan(userId: string): Promise<{ plan: string; planExpiresAt: Date | null }> {
  const user = await db('users').where({ id: userId }).select('plan', 'plan_expires_at').first();
  if (!user) throw new Error('User not found');
  const plan = (user.plan as string) || 'free';
  const planExpiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  if (planExpiresAt && planExpiresAt < new Date()) {
    return { plan: 'free', planExpiresAt: null };
  }
  return { plan, planExpiresAt };
}

function currentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function ensureUserUsageRow(userId: string): Promise<{ requirementPrototypeCount: number; codeGenerationCount: number }> {
  const month = currentMonth();
  let row = await db('user_usage').where({ user_id: userId, month }).first();
  if (!row) {
    await db('user_usage').insert({
      user_id: userId,
      month,
      requirement_prototype_count: 0,
      code_generation_count: 0,
    });
    row = await db('user_usage').where({ user_id: userId, month }).first();
  }
  return {
    requirementPrototypeCount: row?.requirement_prototype_count ?? 0,
    codeGenerationCount: row?.code_generation_count ?? 0,
  };
}

export type QuotaType = 'requirement_prototype' | 'code_generation';

/** 获取用户所属且有余量的团队（企业版信用点池） */
async function getTeamWithCodePool(userId: string): Promise<{ id: string; code_gen_pool: number } | null> {
  const row = await db('team_members')
    .join('teams', 'teams.id', 'team_members.team_id')
    .where('team_members.user_id', userId)
    .where('teams.code_gen_pool', '>', 0)
    .select('teams.id', 'teams.code_gen_pool')
    .first();
  return row ? { id: row.id, code_gen_pool: row.code_gen_pool } : null;
}

/** 获取用户的充值额度 */
async function getUserTopup(userId: string): Promise<{ id: string; remaining: number } | null> {
  const row = await db('quota_topups')
    .where('user_id', userId)
    .where('type', 'code_gen')
    .where('remaining', '>', 0)
    .where('expires_at', '>', db.fn.now())
    .select('id', 'remaining')
    .first();
  return row ? { id: row.id, remaining: row.remaining } : null;
}

export async function checkQuota(userId: string, type: QuotaType): Promise<{ allowed: boolean; message?: string }> {
  // Credits 作为唯一硬额度，user_usage 仅保留统计用途
  const balance = await getUserCreditsBalance(userId);
  const minProto = Number(process.env.MIN_PROTO_CALL_CREDITS ?? 1);
  const minCode = Number(process.env.MIN_CODE_CALL_CREDITS ?? 10);

  if (type === 'requirement_prototype') {
    if (balance < Math.max(1, minProto)) {
      return { allowed: false, message: 'Credits 余额不足，无法生成原型，请升级套餐或充值' };
    }
  } else if (type === 'code_generation') {
    if (balance < Math.max(1, minCode)) {
      return { allowed: false, message: 'Credits 余额不足，无法生成完整代码，请升级套餐或充值' };
    }
  }

  // 仍确保 user_usage 行存在，用于统计用途
  await ensureUserUsageRow(userId);
  return { allowed: true };
}

export async function deductQuota(userId: string, type: QuotaType): Promise<void> {
  // 仅用于统计：记录本月已触发的调用次数，实际扣费由 DeepSeek/Kiro usage 完成
  const month = currentMonth();
  await ensureUserUsageRow(userId);
  if (type === 'requirement_prototype') {
    await db('user_usage').where({ user_id: userId, month }).increment('requirement_prototype_count', 1);
  } else {
    await db('user_usage').where({ user_id: userId, month }).increment('code_generation_count', 1);
  }
}

export async function resetMonthlyQuotaForUser(userId: string): Promise<void> {
  const month = currentMonth();
  await db('user_usage').where({ user_id: userId, month }).update({
    requirement_prototype_count: 0,
    code_generation_count: 0,
    updated_at: db.fn.now(),
  });
}
