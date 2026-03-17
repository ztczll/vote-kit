import Redis from 'ioredis';
import axios from 'axios';
import db from '../config/database';
import { deductQuota } from './plan.service';

interface ForgeTask {
  task_id: string;
  app_name: string;
  prompt: string;
  callback_url: string;
  created_at: string;
  priority: string;
  timeout_seconds: number;
  metadata: {
    user_id: string;
    requirement_id: string;
    vote_kit_app_id: string;
  };
}

interface ForgeCallback {
  task_id: string;
  status: 'in_progress' | 'completed' | 'failed';
  result?: {
    git_repository_url: string;
    docker_image?: string;
    deployment_url?: string;
    compose_file_path?: string;
    source_zip_path?: string;
    source_file_name?: string;
    tokens_used?: number;
    cost_cents?: number;
  };
  error?: {
    code: string;
    message: string;
    step: string;
  };
  timestamps: {
    started_at: string;
    completed_at?: string;
  };
}

export class ForgeEngineService {
  private redis: Redis;
  private forgeQueueName = 'forge_tasks';
  private exportServiceUrl = process.env.FORGE_EXPORT_URL || 'http://forge-export:8081';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'votekit-redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || 'changeme',
      db: 1, // 使用数据库 1 与 Forge Engine 保持一致
    });
  }

  /** Queue key by priority. Worker should consume: dedicated -> priority -> normal */
  private queueKey(priority: string): string {
    const p = (priority || 'normal').toLowerCase();
    if (p === 'dedicated') return `${this.forgeQueueName}:dedicated`;
    if (p === 'priority') return `${this.forgeQueueName}:priority`;
    return `${this.forgeQueueName}:normal`;
  }

  async submitTask(
    appId: string,
    appName: string,
    prompt: string,
    userId: string,
    requirementId: string,
    priority: string = 'normal'
  ): Promise<string> {
    const taskId = `vote-kit-${appId}-${Date.now()}`;
    const queueKey = this.queueKey(priority);

    const task: ForgeTask = {
      task_id: taskId,
      app_name: appName,
      prompt,
      callback_url: `${process.env.VOTE_KIT_BASE_URL}/api/forge/callback`,
      created_at: new Date().toISOString(),
      priority,
      timeout_seconds: 1800, // 30分钟超时
      metadata: {
        user_id: userId,
        requirement_id: requirementId,
        vote_kit_app_id: appId
      }
    };

    await this.redis.lpush(queueKey, JSON.stringify(task));

    console.log(`📤 Submitted Forge task ${taskId} for app ${appId} (queue: ${queueKey})`);
    return taskId;
  }

  /** Return lengths of each priority queue for admin monitoring */
  async getQueueLengths(): Promise<{ dedicated: number; priority: number; normal: number }> {
    const [dedicated, priority, normal] = await Promise.all([
      this.redis.llen(`${this.forgeQueueName}:dedicated`),
      this.redis.llen(`${this.forgeQueueName}:priority`),
      this.redis.llen(`${this.forgeQueueName}:normal`),
    ]);
    return { dedicated, priority, normal };
  }

  async handleCallback(callback: ForgeCallback): Promise<void> {
    const { task_id, status } = callback;
    const appId = this.extractAppIdFromTaskId(task_id);

    console.log(`📞 Received callback for task ${task_id}, status: ${status}`);

    try {
      switch (status) {
        case 'in_progress':
          await this.handleProgress(appId, callback);
          break;
        case 'completed':
          await this.handleCompletion(appId, callback);
          break;
        case 'failed':
          await this.handleFailure(appId, callback);
          break;
      }
    } catch (error: any) {
      console.error(`❌ Error handling callback for ${task_id}:`, error.message);
    }
  }

  private extractAppIdFromTaskId(taskId: string): string {
    // 从 task_id 中提取 app_id: vote-kit-{appId}-{timestamp}
    const parts = taskId.split('-');
    if (parts.length >= 3) {
      return parts[2]; // appId 部分
    }
    throw new Error(`Invalid task_id format: ${taskId}`);
  }

  private async handleProgress(appId: string, callback: ForgeCallback): Promise<void> {
    // 更新应用状态为生成中
    await db('generated_apps')
      .where('id', appId)
      .update({ 
        status: 'generating',
        updated_at: new Date()
      });
  }

  private async handleCompletion(appId: string, callback: ForgeCallback): Promise<void> {
    if (!callback.result) {
      throw new Error('Missing result in completion callback');
    }

    const { git_repository_url, source_zip_path, source_file_name, tokens_used, cost_cents } = callback.result;

    // Note: Quota is already deducted when task is submitted (in app-generation.routes.ts)
    // No need to deduct again here

    // 更新应用状态为就绪，保存源码包路径、tokens和费用
    await db('generated_apps')
      .where('id', appId)
      .update({
        status: 'ready', // 源码已准备好，可以下载
        git_repository_url,
        source_download_url: source_file_name ? `/api/download/${source_file_name}` : null,
        source_file_name: source_file_name || null,
        tokens_used: tokens_used || 0,
        cost_cents: cost_cents || 0,
        billing_status: 'calculated', // 费用已计算
        updated_at: new Date()
      });

    const resultUrl = source_file_name ? `/api/download/${source_file_name}` : null;
    const appIdNum = parseInt(appId, 10);
    if (!isNaN(appIdNum)) {
      await db('gen_tasks').where({ generated_app_id: appIdNum }).update({
      status: 'completed',
        result_artifact_url: resultUrl,
        error_message: null,
        updated_at: new Date(),
      });
    }

    console.log(`✅ App ${appId} source code packaged, ready for download`);
    console.log(`📦 Zip file: ${source_file_name}, path: ${source_zip_path}`);
    console.log(`💰 Tokens: ${tokens_used || 0}, Cost: ${(cost_cents || 0) / 100}元`);
  }

  // Removed triggerVoteKitDeployment - no longer deploying, just providing source code

  private async handleFailure(appId: string, callback: ForgeCallback): Promise<void> {
    const errorMessage = callback.error?.message || 'Unknown error';

    const appIdNum = parseInt(appId, 10);
    if (!isNaN(appIdNum)) {
      await db('gen_tasks').where({ generated_app_id: appIdNum }).update({
        status: 'failed',
      error_message: errorMessage,
        updated_at: new Date(),
      });
    }

    await db('generated_apps')
      .where('id', appId)
      .update({
        status: 'error',
        error_message: errorMessage,
        updated_at: new Date()
      });

    console.log(`❌ App ${appId} generation failed: ${errorMessage}`);
  }

  // 导出源码包
  private async exportSourceCode(taskId: string, appId: string): Promise<any> {
    const app = await db('generated_apps').where('id', appId).first();
    if (!app) {
      throw new Error(`App ${appId} not found`);
    }

    const response = await axios.post(`${this.exportServiceUrl}/api/export`, {
      task_id: taskId,
      app_name: app.name,
      include_readme: true
    });

    return response.data;
  }

  // 获取源码下载链接（返回通过后端代理的下载链接）
  async getSourceDownloadUrl(appId: string): Promise<string | null> {
    const app = await db('generated_apps')
      .where('id', appId)
      .first();

    if (!app || !app.source_download_url || !app.source_file_name) {
      return null;
    }

    // 返回通过后端代理的下载链接，而不是直接返回 forge export server 的地址
    // 前端会通过这个链接从后端下载，后端会从 forge export server 获取文件
    return `/api/app-generation/${appId}/download-file`;
  }

}

export const forgeEngineService = new ForgeEngineService();
