import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/db';
import { User } from '../types/models';
import { addCredits } from './credits.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const SALT_ROUNDS = 10;
const EMAIL_VERIFICATION_TTL_HOURS = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24);
/** 内测：新用户注册赠送的 Credits（0 为不赠送），以加油包形式一次性到账 */
const WELCOME_CREDITS_BONUS = Math.max(0, Number(process.env.WELCOME_CREDITS_BONUS ?? 200));

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface EmailVerificationHandler {
  sendVerificationEmail: (params: {
    user: Omit<User, 'password_hash'>;
    token: string;
  }) => Promise<void>;
}

const dummyEmailHandler: EmailVerificationHandler = {
  async sendVerificationEmail() {
    // 在本地或未配置邮件服务时，静默忽略，避免影响注册流程
    return;
  },
};

export class AuthService {
  constructor(private emailHandler: EmailVerificationHandler = dummyEmailHandler) {}

  async register(username: string, email: string, password: string): Promise<Omit<User, 'password_hash'>> {
    if (!username || username.trim().length === 0) {
      throw new Error('Username is required');
    }
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Valid email is required');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const existing = await db('users')
      .where({ username })
      .orWhere({ email })
      .first();
    if (existing) {
      if (existing.username === username) {
        throw new Error('Username already exists');
      }
      if (existing.email === email) {
        throw new Error('Email already exists');
      }
      throw new Error('Username already exists');
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    // MySQL 下 .returning 无效，insert 返回自增 id；PostgreSQL 下可返回包含 id 的对象
    const insertResult = await db('users').insert({
      username,
      email,
      password_hash,
      role: 'user',
      plan: 'free',
      email_verified: false,
    });

    let id: any;
    if (Array.isArray(insertResult) && insertResult.length > 0) {
      // PostgreSQL: [{ id: '...' }]; MySQL: [1]
      const first = insertResult[0] as any;
      id = typeof first === 'object' && first !== null ? first.id : first;
    }
    if (!id) {
      // 兼容性兜底：根据用户名再查一次
      const created = await db('users').where({ username }).first('id');
      if (!created) {
        throw new Error('Failed to create user');
      }
      id = created.id;
    }

    const user = await db('users').where({ id }).first();

    // 内测：为新用户赠送 Credits，加油包方式一次性到账
    if (WELCOME_CREDITS_BONUS > 0) {
      await addCredits(String(id), WELCOME_CREDITS_BONUS, 'welcome', {
        reason: 'welcome_bonus',
      });
    }

    // 生成邮箱验证 token 并发送邮件（忽略发送失败以免影响注册主流程）
    try {
      const { token } = await this.createEmailVerificationToken(user, undefined);
      const { password_hash: _ph, ...userWithoutPassword } = user;
      await this.emailHandler.sendVerificationEmail({
        user: userWithoutPassword,
        token,
      });
    } catch {
      // 记录日志可在此处扩展
    }

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(username: string, password: string): Promise<{ token: string; user: Omit<User, 'password_hash'> }> {
    // 支持用户名或邮箱登录
    const user = await db('users')
      .where({ username })
      .orWhere({ email: username })
      .first();
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email_verified: !!user.email_verified },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    const { password_hash: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  async verifyToken(token: string): Promise<{ id: string; role: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
      return decoded;
    } catch {
      throw new Error('Invalid token');
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * 创建邮箱验证 token 记录并返回原始 token（用于拼接到验证链接）
   */
  async createEmailVerificationToken(
    user: User,
    options?: { ip?: string; userAgent?: string },
  ): Promise<{ token: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_TTL_HOURS);

    // 作废用户之前未使用的 token
    await db('email_verification_tokens')
      .where({ user_id: user.id })
      .whereNull('used_at')
      .del();

    await db('email_verification_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_ip: options?.ip,
      created_user_agent: options?.userAgent,
    });

    return { token: rawToken };
  }

  /**
   * 验证邮箱 token，成功则标记用户为已验证，并失效 token
   */
  async verifyEmailToken(rawToken: string): Promise<User> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const record = await db('email_verification_tokens')
      .where({ token_hash: tokenHash })
      .first();

    if (!record) {
      throw new Error('INVALID_TOKEN');
    }
    if (record.used_at) {
      throw new Error('TOKEN_ALREADY_USED');
    }
    if (new Date(record.expires_at) < now) {
      throw new Error('TOKEN_EXPIRED');
    }

    // 更新用户邮箱验证状态
    await db('users')
      .where({ id: record.user_id })
      .update({
        email_verified: true,
        email_verified_at: now,
      });

    // 标记 token 已使用
    await db('email_verification_tokens')
      .where({ id: record.id })
      .update({ used_at: now });

    const user = await db('users').where({ id: record.user_id }).first();
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const { password_hash: _ph, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
