import db from '../database/db';
import { Comment } from '../types/models';
import { deepSeekService } from './deepseek.service';

export class CommentService {
  async create(userId: string, requirementId: string, content: string): Promise<Comment> {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }
    if (content.length > 500) {
      throw new Error('Comment must not exceed 500 characters');
    }

    const moderation = await deepSeekService.moderateContent(content.trim());
    if (!moderation.pass) {
      throw new Error(moderation.reason || '评论内容不符合规范，请修改后重试');
    }

    await db('comments').insert({ user_id: userId, requirement_id: requirementId, content });
    return await db('comments')
      .where({ user_id: userId, requirement_id: requirementId, content })
      .orderBy('created_at', 'desc')
      .first();
  }

  async getByRequirement(requirementId: string): Promise<Array<Comment & { username: string }>> {
    return await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where({ requirement_id: requirementId })
      .select('comments.*', 'users.username')
      .orderBy('comments.created_at', 'asc');
  }
}
