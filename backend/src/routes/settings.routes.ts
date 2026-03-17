import Router from '@koa/router';
import fs from 'fs/promises';
import path from 'path';
import db from '../config/database';

const router = new Router({ prefix: '/api' });

const WECHAT_QR_PATH = path.join('uploads', 'contact', 'wechat-qr.png');
const UPLOADS_CONTACT_DIR = path.join('uploads', 'contact');

/** 公开：获取联系配置（微信二维码 URL 与更新时间） */
router.get('/settings/contact', async (ctx) => {
  try {
    const row = await db('settings').where({ key: 'wechat_group_qr_updated_at' }).first();
    const updatedAt = row?.value ?? null;
    ctx.body = {
      wechat_group_qr_url: updatedAt ? '/api/settings/wechat-qr-image' : null,
      wechat_group_qr_updated_at: updatedAt,
      wechat_group_description: null,
    };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: e?.message || '获取失败' };
  }
});

/** 公开：提供微信入群二维码图片（固定路径，由管理员上传覆盖） */
router.get('/settings/wechat-qr-image', async (ctx) => {
  try {
    await fs.access(WECHAT_QR_PATH);
    ctx.type = 'image/png';
    ctx.body = await fs.readFile(WECHAT_QR_PATH);
  } catch {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: '暂未配置二维码' };
  }
});

export default router;
export { WECHAT_QR_PATH, UPLOADS_CONTACT_DIR };
