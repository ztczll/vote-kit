import db from '../database/db';

const CREDIT_PRICE_CNY = Number(process.env.CREDIT_PRICE_CNY ?? 0.01);

const DEEPSEEK_PRICE_PROMPT = Number(process.env.DEEPSEEK_PRICE_PROMPT ?? 0.000002); // 元/token
const DEEPSEEK_PRICE_CACHE_HIT = Number(process.env.DEEPSEEK_PRICE_CACHE_HIT ?? 0.0000005);
const DEEPSEEK_PRICE_COMPLETION = Number(process.env.DEEPSEEK_PRICE_COMPLETION ?? 0.000008);
const DEEPSEEK_MARGIN = Number(process.env.DEEPSEEK_MARGIN ?? 1.2);

const KIRO_PRICE_PER_CREDIT_USD = Number(process.env.KIRO_PRICE_PER_CREDIT_USD ?? 0.02);
const USD_TO_CNY_RATE = Number(process.env.USD_TO_CNY_RATE ?? 6.87);
const KIRO_MARGIN = Number(process.env.KIRO_MARGIN ?? 1.45);

function currentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function ensureUserCreditsRow(userId: string): Promise<void> {
  const month = currentMonth();
  const existing = await db('user_credits').where({ user_id: userId, month }).first();
  if (!existing) {
    await db('user_credits').insert({
      user_id: userId,
      month,
      credits_balance: 0,
    });
  }
}

export async function getUserCreditsBalance(userId: string): Promise<number> {
  const month = currentMonth();
  const row = await db('user_credits').where({ user_id: userId, month }).first();
  return row ? Number(row.credits_balance ?? 0) : 0;
}

export async function addCredits(
  userId: string,
  delta: number,
  source: string,
  metadata?: any
): Promise<void> {
  const month = currentMonth();
  await ensureUserCreditsRow(userId);
  await db.transaction(async (trx) => {
    const row = await trx('user_credits').where({ user_id: userId, month }).forUpdate().first();
    const current = row ? Number(row.credits_balance ?? 0) : 0;
    const next = current + delta;
    if (row) {
      await trx('user_credits').where({ user_id: userId, month }).update({
        credits_balance: next,
        updated_at: trx.fn.now(),
      });
    } else {
      await trx('user_credits').insert({
        user_id: userId,
        month,
        credits_balance: next,
      });
    }
    await trx('credits_transactions').insert({
      id: trx.raw('UUID()'),
      user_id: userId,
      source,
      credits_delta: delta,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  });
}

export interface DeepseekUsage {
  prompt_tokens?: number | null;
  prompt_cache_hit_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
}

export function calculateDeepseekCredits(usage: DeepseekUsage): number {
  const prompt = usage.prompt_tokens ?? 0;
  const cacheHit = usage.prompt_cache_hit_tokens ?? 0;
  const completion = usage.completion_tokens ?? 0;

  const costCny =
    prompt * DEEPSEEK_PRICE_PROMPT +
    cacheHit * DEEPSEEK_PRICE_CACHE_HIT +
    completion * DEEPSEEK_PRICE_COMPLETION;

  if (!CREDIT_PRICE_CNY || costCny <= 0) return 0;
  const rawCredits = (costCny / CREDIT_PRICE_CNY) * DEEPSEEK_MARGIN;
  return Math.max(0, Math.ceil(rawCredits));
}

export function calculateKiroCredits(kiroCredits: number): number {
  if (kiroCredits <= 0 || !CREDIT_PRICE_CNY) return 0;
  const costCny = kiroCredits * KIRO_PRICE_PER_CREDIT_USD * USD_TO_CNY_RATE;
  const rawCredits = (costCny / CREDIT_PRICE_CNY) * KIRO_MARGIN;
  return Math.max(0, Math.ceil(rawCredits));
}

export async function chargeKiroUsage(
  userId: string | null | undefined,
  kiroCredits: number,
  extra?: any
): Promise<number> {
  if (!userId || kiroCredits <= 0) return 0;
  const credits = calculateKiroCredits(kiroCredits);
  if (credits <= 0) return 0;
  await addCredits(userId, -credits, 'kiro', {
    kiro_credits_delta: kiroCredits,
    ...extra,
  });
  return credits;
}

export async function chargeDeepseekUsage(
  userId: string | null | undefined,
  usage: DeepseekUsage | null | undefined,
  extra?: { model?: string; operation?: string }
): Promise<number> {
  if (!userId || !usage) return 0;
  const credits = calculateDeepseekCredits(usage);
  if (credits <= 0) return 0;
  await addCredits(userId, -credits, 'deepseek', {
    ...extra,
    usage,
  });
  return credits;
}

