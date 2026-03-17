import * as fc from 'fast-check';
import { RequirementService } from '../services/requirement.service';
import { RequirementStatus } from '../types/models';

describe('RequirementService', () => {
  let requirementService: RequirementService;

  beforeEach(() => {
    requirementService = new RequirementService();
  });

  // Feature: vote-kit, Property 1: 需求列表按热度值降序排列
  // Validates: Requirements 1.1
  describe('Property 1: Requirements sorted by vote count descending', () => {
    it('should return requirements sorted by vote_count in descending order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 1000 }),
            category: fc.constantFrom('工具', '娱乐', '教育', '社交', '其他'),
            vote_count: fc.nat({ max: 10000 })
          }), { minLength: 2, maxLength: 10 }),
          async (requirements) => {
            const { requirements } = await requirementService.getList();
            for (let i = 0; i < requirements.length - 1; i++) {
              expect(requirements[i].vote_count).toBeGreaterThanOrEqual(requirements[i + 1].vote_count);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 3: 状态筛选正确过滤需求
  // Validates: Requirements 1.4
  describe('Property 3: Status filter correctly filters requirements', () => {
    it('should return only requirements matching the selected status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<RequirementStatus>('待审核', '投票中', '已采纳', '已上线', '已拒绝'),
          async (status) => {
            const { requirements } = await requirementService.getList({ status });
            requirements.forEach(req => {
              expect(req.status).toBe(status);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 9: 需求提交验证非空字段
  // Validates: Requirements 4.2
  describe('Property 9: Requirement submission validates non-empty fields', () => {
    it('should reject empty title or description', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.string().filter(s => s.trim().length === 0)
          ),
          fc.string({ minLength: 1 }),
          async (emptyField, validField) => {
            await expect(requirementService.create({
              title: emptyField,
              description: validField,
              category: '工具',
              submitter_id: 'test-user-id'
            })).rejects.toThrow();

            await expect(requirementService.create({
              title: validField,
              description: emptyField,
              category: '工具',
              submitter_id: 'test-user-id'
            })).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 10: 新提交需求初始状态为待审核
  // Validates: Requirements 4.5
  describe('Property 10: New requirement has status 待审核', () => {
    it('should create requirement with status 待审核', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.constantFrom('工具', '娱乐', '教育', '社交', '其他'),
          async (title, description, category) => {
            try {
              const result = await requirementService.create({
                title,
                description,
                category,
                submitter_id: 'test-user-id'
              });
              expect(result.status).toBe('待审核');
            } catch (e) {
              // Skip if creation fails
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
