import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import logger from './config/logger';
import db from './config/database';
import redis from './config/redis';
import authRoutes from './routes/auth.routes';
import requirementRoutes from './routes/requirement.routes';
import voteRoutes from './routes/vote.routes';
import commentRoutes from './routes/comment.routes';
import adminRoutes from './routes/admin.routes';
import statsRoutes from './routes/stats.routes';
import devInteractionRoutes from './routes/dev-interaction.routes';
import aiEnhancedRoutes from './routes/ai-enhanced.routes';
import appGenerationRoutes from './routes/app-generation.routes';
import appGenerationSimpleRoutes from './routes/app-generation-simple.routes';
import forgeRoutes from './routes/forge.routes';
import wizardRoutes from './routes/wizard.routes';
import pencilRoutes from './routes/pencil.routes';
import figmaRoutes from './routes/figma.routes';
import prototypeRoutes from './routes/prototype.routes';
import subscriptionRoutes from './routes/subscription.routes';
import teamRoutes from './routes/team.routes';
import feedbackRoutes from './routes/feedback.routes';
import settingsRoutes from './routes/settings.routes';
import { startDeployTimeoutLoop } from './services/deploy-timeout.service';

const app = new Koa();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser({
  jsonLimit: '10mb',
  textLimit: '10mb'
}));

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    logger.error('Server error:', err);
    ctx.status = err.status || 500;
    ctx.body = { error: 'INTERNAL_ERROR', message: '服务器错误,请稍后重试' };
  }
});

app.use(authRoutes.routes());
app.use(requirementRoutes.routes());
app.use(voteRoutes.routes());
app.use(commentRoutes.routes());
app.use(statsRoutes.routes());
app.use(feedbackRoutes.routes());
app.use(settingsRoutes.routes());
app.use(adminRoutes.routes());
app.use(devInteractionRoutes.routes());
app.use(aiEnhancedRoutes.routes());
appGenerationRoutes.prefix('/api/app-generation');
app.use(appGenerationRoutes.routes());
appGenerationSimpleRoutes.prefix('/api/app-generation-simple');
app.use(appGenerationSimpleRoutes.routes());
forgeRoutes.prefix('/api/forge');
app.use(forgeRoutes.routes());
app.use(wizardRoutes.routes());
app.use(pencilRoutes.routes());
app.use(figmaRoutes.routes());
prototypeRoutes.prefix('/api/prototype');
app.use(prototypeRoutes.routes());
subscriptionRoutes.prefix('/api/subscriptions');
app.use(subscriptionRoutes.routes());
teamRoutes.prefix('/api');
app.use(teamRoutes.routes());

app.use(async (ctx) => {
  if (ctx.path === '/health') {
    ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
  } else {
    ctx.status = 404;
    ctx.body = { error: 'NOT_FOUND', message: '资源不存在' };
  }
});

app.on('error', (err) => {
  logger.error('Server error:', err);
});

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  startDeployTimeoutLoop();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    db.destroy();
    redis.quit();
    process.exit(0);
  });
});

export default app;
