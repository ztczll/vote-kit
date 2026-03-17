import db from '../config/database';
import logger from '../config/logger';

const DEPLOY_TIMEOUT_MINUTES = 15;
const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 分钟

/**
 * 将超过 N 分钟仍为 deploying 的应用标记为 error，并更新对应 app_deployments 为 failed。
 */
export async function runDeployTimeout(): Promise<number> {
  const rows = await db('generated_apps')
    .where('status', 'deploying')
    .whereRaw('updated_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)', [DEPLOY_TIMEOUT_MINUTES])
    .select('id');

  if (rows.length === 0) return 0;

  for (const row of rows) {
    const appId = row.id;
    await db('generated_apps').where('id', appId).update({
      status: 'error',
      updated_at: db.fn.now(),
    });
    const deployment = await db('app_deployments')
      .where('app_id', appId)
      .orderBy('created_at', 'desc')
      .first();
    if (deployment) {
      await db('app_deployments').where('id', deployment.id).update({
        status: 'failed',
        logs: `部署超时（超过 ${DEPLOY_TIMEOUT_MINUTES} 分钟未完成）`,
      });
    }
    logger.info(`Deploy timeout: marked app ${appId} as error`);
  }
  return rows.length;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * 启动定时任务：每 10 分钟检查一次，将超时的 deploying 应用标记为失败。
 */
export function startDeployTimeoutLoop(): void {
  if (intervalId != null) return;
  intervalId = setInterval(async () => {
    try {
      const count = await runDeployTimeout();
      if (count > 0) {
        logger.info(`Deploy timeout: marked ${count} app(s) as failed`);
      }
    } catch (err: any) {
      logger.error('Deploy timeout check error:', err);
    }
  }, CHECK_INTERVAL_MS);
  logger.info(`Deploy timeout check started (every ${CHECK_INTERVAL_MS / 60000} min, timeout ${DEPLOY_TIMEOUT_MINUTES} min)`);
}

/**
 * 停止定时任务（用于测试或优雅关闭）。
 */
export function stopDeployTimeoutLoop(): void {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
