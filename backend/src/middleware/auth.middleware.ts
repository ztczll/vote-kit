import { Context, Next } from 'koa';
import { AuthService } from '../services/auth.service';
import jwt from 'jsonwebtoken';

const authService = new AuthService();

export async function authenticate(ctx: Context, next: Next) {
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { error: 'UNAUTHORIZED', message: '请先登录' };
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await authService.verifyToken(token);
    ctx.state.user = decoded;
    await next();
  } catch {
    ctx.status = 401;
    ctx.body = { error: 'UNAUTHORIZED', message: '请先登录' };
  }
}

export async function authenticateDeveloper(ctx: Context, next: Next) {
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { success: false, message: '未登录' };
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; type: string };
    if (decoded.type !== 'developer') {
      ctx.status = 401;
      ctx.body = { success: false, message: '无效的开发者令牌' };
      return;
    }
    ctx.state.user = decoded;
    await next();
  } catch {
    ctx.status = 401;
    ctx.body = { success: false, message: '未登录' };
  }
}

/** 可选认证：有 token 则解析并设置 user，无 token 也放行 */
export async function authenticateOptional(ctx: Context, next: Next) {
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await next();
    return;
  }
  const token = authHeader.substring(7);
  try {
    const decoded = await authService.verifyToken(token);
    ctx.state.user = decoded;
  } catch {
    // 无效 token 不阻断，仅不设置 user
  }
  await next();
}

export async function requireAdmin(ctx: Context, next: Next) {
  if (ctx.state.user?.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: 'FORBIDDEN', message: '无权限执行此操作' };
    return;
  }
  await next();
}

// 新增：确保只有开发者或管理员可以访问
export async function requireDeveloperOrAdmin(ctx: Context, next: Next) {
  const userRole = ctx.state.user?.role;
  const userType = ctx.state.user?.type;
  
  if (userRole !== 'admin' && userType !== 'developer') {
    ctx.status = 403;
    ctx.body = { error: 'FORBIDDEN', message: '仅开发者和管理员可访问' };
    return;
  }
  await next();
}

// 新增：验证任务分配权限（仅管理员可分配给开发者）
export async function validateTaskAssignment(ctx: Context, next: Next) {
  if (ctx.state.user?.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: 'FORBIDDEN', message: '仅管理员可分配任务' };
    return;
  }
  
  // 检查分配目标是否为开发者
  const { assignedTo, assignedToType } = ctx.request.body as any;
  if (assignedTo && assignedToType !== 'developer') {
    ctx.status = 400;
    ctx.body = { error: 'INVALID_ASSIGNMENT', message: '只能分配任务给开发者' };
    return;
  }
  
  await next();
}
