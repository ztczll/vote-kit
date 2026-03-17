import Router from '@koa/router';
import { VoteService } from '../services/vote.service';
import { authenticate } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api/votes' });
const voteService = new VoteService();

router.post('/', authenticate, async (ctx) => {
  try {
    const { requirement_id } = ctx.request.body as any;
    const vote = await voteService.vote(ctx.state.user.id, requirement_id);
    ctx.status = 201;
    ctx.body = { vote };
  } catch (error: any) {
    ctx.status = 409;
    ctx.body = { error: 'BUSINESS_ERROR', message: error.message };
  }
});

router.get('/limit', authenticate, async (ctx) => {
  try {
    const limit = await voteService.checkVoteLimit(ctx.state.user.id);
    ctx.body = limit;
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.get('/check/:requirementId', authenticate, async (ctx) => {
  try {
    const { requirementId } = ctx.params;
    const hasVoted = await voteService.hasVoted(ctx.state.user.id, requirementId);
    ctx.body = { hasVoted };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

export default router;
