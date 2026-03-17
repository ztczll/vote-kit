import db from '../database/db';

export class DevLogService {
  async createLog(requirementId: string, developerId: string, title: string, content: string, logType: string) {
    const [id] = await db('dev_logs').insert({
      requirement_id: requirementId,
      developer_id: developerId,
      title,
      content,
      log_type: logType
    });

    return await db('dev_logs').where({ id }).first();
  }

  async getLogs(requirementId: string) {
    const logs = await db('dev_logs')
      .where({ requirement_id: requirementId })
      .join('developers', 'dev_logs.developer_id', 'developers.id')
      .select(
        'dev_logs.*',
        'developers.name as developer_name'
      )
      .orderBy('dev_logs.created_at', 'desc');

    return logs;
  }

  async likeLog(logId: string, userId: string) {
    const existing = await db('log_likes')
      .where({ log_id: logId, user_id: userId })
      .first();

    if (existing) {
      return; // 已点赞
    }

    await db('log_likes').insert({
      log_id: logId,
      user_id: userId
    });

    // 更新点赞数
    await db('dev_logs')
      .where({ id: logId })
      .increment('likes_count', 1);
  }

  async unlikeLog(logId: string, userId: string) {
    const deleted = await db('log_likes')
      .where({ log_id: logId, user_id: userId })
      .delete();

    if (deleted > 0) {
      // 更新点赞数
      await db('dev_logs')
        .where({ id: logId })
        .decrement('likes_count', 1);
    }
  }

  async addComment(logId: string, userId: string, content: string) {
    await db('log_comments').insert({
      log_id: logId,
      user_id: userId,
      content
    });

    // 更新评论数
    await db('dev_logs')
      .where({ id: logId })
      .increment('comments_count', 1);
  }

  async getComments(logId: string) {
    const comments = await db('log_comments')
      .where({ log_id: logId })
      .join('users', 'log_comments.user_id', 'users.id')
      .select(
        'log_comments.*',
        'users.username'
      )
      .orderBy('log_comments.created_at', 'asc');

    return comments;
  }

  async getUserLikes(requirementId: string, userId: string) {
    const logs = await db('dev_logs')
      .where({ requirement_id: requirementId })
      .select('id');

    const logIds = logs.map(l => l.id);

    const likes = await db('log_likes')
      .whereIn('log_id', logIds)
      .where({ user_id: userId })
      .select('log_id');

    return likes.map(l => l.log_id);
  }
}
