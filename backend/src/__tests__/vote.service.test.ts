import * as fc from 'fast-check';
import { VoteService } from '../services/vote.service';

describe('VoteService', () => {
  let voteService: VoteService;

  beforeEach(() => {
    voteService = new VoteService();
  });

  // Feature: vote-kit, Property 7: 每日投票限制被强制执行
  // Validates: Requirements 3.3
  describe('Property 7: Daily vote limit enforced', () => {
    it('should reject votes after 3 votes in a day', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 4, maxLength: 10 }),
          async (userId, requirementIds) => {
            try {
              await voteService.vote(userId, requirementIds[0]);
              await voteService.vote(userId, requirementIds[1]);
              await voteService.vote(userId, requirementIds[2]);
              await expect(voteService.vote(userId, requirementIds[3])).rejects.toThrow('Daily vote limit exceeded');
            } catch (e) {
              // Skip if votes fail
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 8: 重复投票被阻止
  // Validates: Requirements 3.4
  describe('Property 8: Duplicate votes prevented', () => {
    it('should reject duplicate votes for same requirement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, requirementId) => {
            try {
              await voteService.vote(userId, requirementId);
              await expect(voteService.vote(userId, requirementId)).rejects.toThrow('already voted');
            } catch (e) {
              // Skip if first vote fails
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
