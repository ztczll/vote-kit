import Router from '@koa/router';
import { CommentService } from '../services/comment.service';
import { authenticate } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api/comments' });
const commentService = new CommentService();

router.get('/requirement/:requirementId', async (ctx) => {
  try {
    const comments = await commentService.getByRequirement(ctx.params.requirementId);
    ctx.body = { comments };
  } catch (error: any) {
    ctx.status = 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: error.message };
  }
});

router.post('/', authenticate, async (ctx) => {
  try {
    const { requirement_id, content } = ctx.request.body as any;
    const comment = await commentService.create(ctx.state.user.id, requirement_id, content);
    ctx.status = 201;
    ctx.body = { comment };
  } catch (error: any) {
    ctx.status = 400;
    ctx.body = { error: 'VALIDATION_ERROR', message: error.message };
  }
});

export default router;
