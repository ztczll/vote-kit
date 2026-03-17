import * as fc from 'fast-check';
import { CommentService } from '../services/comment.service';

describe('CommentService', () => {
  let commentService: CommentService;

  beforeEach(() => {
    commentService = new CommentService();
  });

  // Feature: vote-kit, Property 30: 评论长度限制被强制执行
  // Validates: Requirements 12.4
  describe('Property 30: Comment length limit enforced', () => {
    it('should reject comments exceeding 500 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 501, maxLength: 1000 }),
          async (userId, requirementId, longContent) => {
            await expect(commentService.create(userId, requirementId, longContent)).rejects.toThrow('must not exceed 500 characters');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 27: 评论按时间顺序排列
  // Validates: Requirements 12.1
  describe('Property 27: Comments sorted chronologically', () => {
    it('should return comments sorted by created_at', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (requirementId) => {
            const comments = await commentService.getByRequirement(requirementId);
            for (let i = 0; i < comments.length - 1; i++) {
              expect(new Date(comments[i].created_at).getTime()).toBeLessThanOrEqual(
                new Date(comments[i + 1].created_at).getTime()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
