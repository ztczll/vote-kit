import Router from '@koa/router';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import db from '../database/db';
import redis from '../config/redis';

const router = new Router({ prefix: '/api/auth' });
const emailService = new EmailService();
const authService = new AuthService(emailService);

router.post('/register', async (ctx) => {
  try {
    const { username, email, password } = ctx.request.body as any;
    const user = await authService.register(username, email, password);
    ctx.status = 201;
    ctx.body = { user };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: error.message };
  }
});

router.post('/login', async (ctx) => {
  try {
    const { username, email, password } = ctx.request.body as any;
    const loginField = email || username;
    const result = await authService.login(loginField, password);
    ctx.body = result;
  } catch (error: any) {
    ctx.status = 401;
    ctx.body = { error: 'UNAUTHORIZED', message: error.message };
  }
});

async function todayKey(): Promise<string> {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function checkResendLimit(ip: string, email: string): Promise<{ allowed: boolean; message?: string }> {
  const keyBase = `rl:email-verify:${await todayKey()}`;
  const ipKey = `${keyBase}:ip:${ip}`;
  const emailKey = `${keyBase}:email:${email}`;
  const limitPerIp = parseInt(process.env.RATE_LIMIT_EMAIL_VERIFY_IP_PER_DAY || '50', 10);
  const limitPerEmail = parseInt(process.env.RATE_LIMIT_EMAIL_VERIFY_PER_DAY || '5', 10);

  try {
    const [ipCount, emailCount] = await Promise.all([
      redis.incr(ipKey),
      redis.incr(emailKey),
    ]);
    if (ipCount === 1) await redis.expire(ipKey, 86400 * 2);
    if (emailCount === 1) await redis.expire(emailKey, 86400 * 2);

    if (ipCount > limitPerIp) {
      return { allowed: false, message: '该 IP 今日重发次数过多，请明日再试' };
    }
    if (emailCount > limitPerEmail) {
      return { allowed: false, message: '该邮箱今日重发次数已达上限，请明日再试' };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

// 重新发送验证邮件（频率限制）
router.post('/resend-verification', async (ctx) => {
  try {
    const { email } = ctx.request.body as any;
    if (!email) {
      ctx.status = 400;
      ctx.body = { error: 'VALIDATION_ERROR', message: 'Email is required' };
      return;
    }

    const limitResult = await checkResendLimit(ctx.ip, email);
    if (!limitResult.allowed) {
      ctx.status = 429;
      ctx.body = { error: 'RATE_LIMITED', message: limitResult.message };
      return;
    }

    const user = await db('users').where({ email }).first();
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: 'NOT_FOUND', message: 'User not found' };
      return;
    }

    if (user.email_verified) {
      ctx.status = 400;
      ctx.body = { error: 'ALREADY_VERIFIED', message: 'Email already verified' };
      return;
    }

    const { token } = await authService.createEmailVerificationToken(user, {
      ip: ctx.ip,
      userAgent: ctx.get('user-agent'),
    });

    const { password_hash: _ph, ...userWithoutPassword } = user;
    await emailService.sendVerificationEmail({
      user: userWithoutPassword,
      token,
    });

    ctx.body = { success: true };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { error: 'BAD_REQUEST', message: error.message };
  }
});

// 点击验证邮箱
router.get('/verify-email', async (ctx) => {
  const token = ctx.query.token as string | undefined;
  if (!token) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: 'Token is required' };
    return;
  }

  try {
    await authService.verifyEmailToken(token);
    const base = (process.env.FRONTEND_BASE_URL || ctx.origin).replace(/\/+$/, '');
    const redirectUrl = `${base}/email-verified-success`;

    // 成功后重定向到前端页面，前端可根据路由展示成功信息
    ctx.redirect(redirectUrl);
  } catch (error: any) {
    const reason = error.message;
    const base = (process.env.FRONTEND_BASE_URL || ctx.origin).replace(/\/+$/, '');
    const redirectUrl = `${base}/email-verification-failed?reason=${encodeURIComponent(reason)}`;
    ctx.redirect(redirectUrl);
  }
});

export default router;
