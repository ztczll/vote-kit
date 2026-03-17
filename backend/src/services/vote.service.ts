import db from '../database/db';
import redis from '../config/redis';
import { Vote } from '../types/models';
import { AnalyticsService } from './analytics.service';

const DAILY_VOTE_LIMIT = 3;
const analyticsService = new AnalyticsService();

export class VoteService {
  async vote(userId: string, requirementId: string): Promise<Vote> {
    const hasVoted = await this.hasVoted(userId, requirementId);
    if (hasVoted) {
      throw new Error('You have already voted for this requirement');
    }

    const remaining = await this.checkVoteLimit(userId);
    if (remaining.remaining <= 0) {
      throw new Error('Daily vote limit exceeded');
    }

    await db('votes').insert({ user_id: userId, requirement_id: requirementId });
    await db('requirements').where({ id: requirementId }).increment('vote_count', 1);

    const today = new Date().toISOString().split('T')[0];
    await redis.incr(`vote:daily:${userId}:${today}`);
    await redis.expire(`vote:daily:${userId}:${today}`, 86400);
    await redis.sadd(`vote:user:${userId}`, requirementId);

    await analyticsService.track({
      userId,
      eventType: 'vote',
      metadata: { requirementId },
    });

    return await db('votes').where({ user_id: userId, requirement_id: requirementId }).first();
  }

  async checkVoteLimit(userId: string): Promise<{ remaining: number; total: number }> {
    const today = new Date().toISOString().split('T')[0];
    const count = parseInt(await redis.get(`vote:daily:${userId}:${today}`) || '0');
    return { remaining: DAILY_VOTE_LIMIT - count, total: DAILY_VOTE_LIMIT };
  }

  async hasVoted(userId: string, requirementId: string): Promise<boolean> {
    return await redis.sismember(`vote:user:${userId}`, requirementId) === 1;
  }

  async getVoteCount(requirementId: string): Promise<number> {
    const result = await db('requirements').where({ id: requirementId }).first();
    return result?.vote_count || 0;
  }
}
