import Router from '@koa/router';
import { Context } from 'koa';
import { forgeEngineService } from '../services/forge-engine.service';

const router = new Router();

// Forge Engine 回调接口
router.post('/callback', async (ctx: Context) => {
  try {
    const callback = ctx.request.body as any;
    
    console.log('📞 Received Forge Engine callback:', {
      task_id: callback.task_id,
      status: callback.status
    });

    // 处理回调
    await forgeEngineService.handleCallback(callback);

    ctx.body = { status: 'ok' };
  } catch (error: any) {
    console.error('❌ Forge callback error:', error);
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

export default router;
