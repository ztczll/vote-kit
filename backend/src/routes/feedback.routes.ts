import Router from '@koa/router';
import db from '../config/database';
import { authenticateOptional } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api' });

router.post('/feedback', authenticateOptional, async (ctx) => {
  try {
    const body = ctx.request.body as {
      type?: string;
      content?: string;
      contact?: string;
      pageUrl?: string;
    };
    if (!body.type || !body.content || typeof body.content !== 'string') {
      ctx.status = 400;
      ctx.body = { error: 'MISSING_PARAMS', message: 'type 与 content 必填' };
      return;
    }
    const user = ctx.state.user;
    await db('feedback').insert({
      type: String(body.type).slice(0, 32),
      content: body.content.trim().slice(0, 5000),
      contact: body.contact ? String(body.contact).slice(0, 200) : null,
      user_id: user?.id ?? null,
      page_url: body.pageUrl ? String(body.pageUrl).slice(0, 500) : null,
      status: 'pending',
    });
    ctx.status = 201;
    ctx.body = { success: true, message: '感谢反馈' };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: e?.message || '提交失败' };
  }
});

export default router;
