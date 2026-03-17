import redis from '../config/redis';

const RATE_LIMIT_IP_PROTO_PER_DAY = parseInt(process.env.RATE_LIMIT_IP_PROTO_PER_DAY || '100', 10);
const RATE_LIMIT_IP_CODE_PER_DAY = parseInt(process.env.RATE_LIMIT_IP_CODE_PER_DAY || '20', 10);
const RATE_LIMIT_USER_CODE_PER_DAY = parseInt(process.env.RATE_LIMIT_USER_CODE_PER_DAY || '50', 10);

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function checkAndIncrementIpLimit(ip: string, type: 'proto' | 'code'): Promise<{ allowed: boolean; message?: string }> {
  const limit = type === 'proto' ? RATE_LIMIT_IP_PROTO_PER_DAY : RATE_LIMIT_IP_CODE_PER_DAY;
  const key = `rl:ip:${ip}:${type}:${todayKey()}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86400 * 2);
    if (count > limit) {
      return { allowed: false, message: `今日该 IP 的${type === 'proto' ? '需求/原型' : '代码'}生成次数已达上限，请明日再试` };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export async function checkAndIncrementUserCodeLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const key = `rl:user:${userId}:code:${todayKey()}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86400 * 2);
    if (count > RATE_LIMIT_USER_CODE_PER_DAY) {
      return { allowed: false, message: '您今日代码生成次数已达上限，请明日再试' };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
