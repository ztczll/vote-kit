import db from '../database/db';

interface AIUsageLog {
  provider: string;
  model: string;
  operation: string;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  success: boolean;
  error_message?: string;
  created_at: Date;
}

export class AIMonitoringService {
  async logUsage(log: Omit<AIUsageLog, 'created_at'>): Promise<void> {
    try {
      await db('ai_usage_logs').insert({
        ...log,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
    }
  }

  async getUsageStats(days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [providerStats, operationStats, costStats] = await Promise.all([
      db('ai_usage_logs')
        .where('created_at', '>=', since)
        .select('provider')
        .count('* as count')
        .sum('cost as total_cost')
        .groupBy('provider'),
      
      db('ai_usage_logs')
        .where('created_at', '>=', since)
        .select('operation')
        .count('* as count')
        .avg('cost as avg_cost')
        .groupBy('operation'),
      
      db('ai_usage_logs')
        .where('created_at', '>=', since)
        .select(db.raw('DATE(created_at) as date'))
        .sum('cost as daily_cost')
        .count('* as daily_calls')
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date')
    ]);

    return {
      providerStats,
      operationStats,
      costStats,
      period: `${days} days`
    };
  }

  calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
    const rates = {
      deepseek: { input: 2 / 1000000, output: 3 / 1000000 }, // 2元/百万输入，3元/百万输出
      coze: { input: 5 / 1000000, output: 8 / 1000000 } // 估算价格
    };

    const rate = rates[provider as keyof typeof rates] || rates.deepseek;
    return (inputTokens * rate.input) + (outputTokens * rate.output);
  }

  async getTodayCost(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const row = await db('ai_usage_logs')
      .where('created_at', '>=', today)
      .sum('cost as total')
      .first();
    return Number(row?.total ?? 0);
  }

  /** 检查当日成本是否超过阈值（如 10 美元），可用于告警 */
  async checkCostAlert(thresholdUsd: number): Promise<{ over: boolean; totalToday: number }> {
    const totalToday = await this.getTodayCost();
    return { over: totalToday >= thresholdUsd, totalToday };
  }
}

export const aiMonitoringService = new AIMonitoringService();
