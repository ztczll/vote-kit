import Router from '@koa/router';
import { StatsService } from '../services/stats.service';

const router = new Router({ prefix: '/api' });
const statsService = new StatsService();

router.get('/stats', async (ctx) => {
  try {
    const stats = await statsService.getHomeStats();
    ctx.body = stats;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

export default router;
