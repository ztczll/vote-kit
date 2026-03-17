import db from '../database/db';
import { randomUUID } from 'crypto';
import { addCredits } from './credits.service';

export type PlanId = 'free' | 'pro' | 'pro_plus' | 'enterprise';

export async function createOrder(userId: string, plan: PlanId, provider: 'alipay' | 'wechat'): Promise<{ orderId: string; amount: number; redirectUrl?: string }> {
  const config = await db('plans_config').where({ plan }).first();
  if (!config || config.price_monthly == null || config.price_monthly <= 0) {
    throw new Error('该套餐不支持在线购买，请联系销售');
  }
  const orderId = randomUUID();
  await db('subscriptions').insert({
    id: orderId,
    user_id: userId,
    plan,
    amount: config.price_monthly,
    provider,
    status: 'pending',
  });
  return {
    orderId,
    amount: config.price_monthly,
    redirectUrl: undefined,
  };
}

export async function handlePaymentCallback(orderId: string, status: 'paid' | 'failed', transactionId?: string): Promise<void> {
  const sub = await db('subscriptions').where({ id: orderId }).first();
  if (!sub) throw new Error('订单不存在');
  if (sub.status !== 'pending') return;

  await db('subscriptions').where({ id: orderId }).update({
    status: status === 'paid' ? 'paid' : 'failed',
    transaction_id: transactionId,
    updated_at: db.fn.now(),
  });

  if (status === 'paid') {
    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setMonth(endAt.getMonth() + 1);
    await db('subscriptions').where({ id: orderId }).update({
      start_at: startAt,
      end_at: endAt,
    });
    await db('users').where({ id: sub.user_id }).update({
      plan: sub.plan,
      plan_expires_at: endAt,
      updated_at: db.fn.now(),
    });
  }
}

export async function getPlansForDisplay(): Promise<Array<{ plan: string; requirementLimit: number; codeGenLimit: number; cacheDays: number; priceMonthly: number | null; queuePriority: string }>> {
  const rows = await db('plans_config').orderBy('price_monthly', 'asc');
  return rows.map((r: any) => ({
    plan: r.plan,
    requirementLimit: r.requirement_limit,
    codeGenLimit: r.code_gen_limit,
    cacheDays: r.cache_days,
    priceMonthly: r.price_monthly,
    queuePriority: r.queue_priority || 'normal',
  }));
}

export async function applyCreditsTopup(
  userId: string,
  credits: number,
  packageId: string
): Promise<{ credits: number }> {
  if (!credits || credits <= 0) {
    throw new Error('INVALID_TOPUP_CREDITS');
  }
  await addCredits(userId, credits, 'topup', { packageId, credits });
  return { credits };
}
