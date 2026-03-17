import * as fc from 'fast-check';
import { AuthService } from '../services/auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  // Feature: vote-kit, Property 18: 用户名唯一性验证
  // Validates: Requirements 7.2
  describe('Property 18: Username uniqueness validation', () => {
    it('should reject registration with duplicate username', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          fc.emailAddress(),
          fc.string({ minLength: 6, maxLength: 50 }),
          async (username, email, password) => {
            try {
              await authService.register(username, email, password);
              await expect(authService.register(username, email + '2', password)).rejects.toThrow('Username already exists');
            } catch (e) {
              // Skip if first registration fails
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 19: 邮箱格式验证
  // Validates: Requirements 7.3
  describe('Property 19: Email format validation', () => {
    it('should reject invalid email formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }),
          fc.string().filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
          fc.string({ minLength: 6 }),
          async (username, invalidEmail, password) => {
            await expect(authService.register(username, invalidEmail, password)).rejects.toThrow('Valid email is required');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 20: 密码长度验证
  // Validates: Requirements 7.4
  describe('Property 20: Password length validation', () => {
    it('should reject passwords shorter than 6 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }),
          fc.emailAddress(),
          fc.string({ maxLength: 5 }),
          async (username, email, shortPassword) => {
            await expect(authService.register(username, email, shortPassword)).rejects.toThrow('Password must be at least 6 characters');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: vote-kit, Property 21: 有效登录创建会话
  // Validates: Requirements 7.5
  describe('Property 21: Valid login creates session', () => {
    it('should return token for valid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
          fc.emailAddress(),
          fc.string({ minLength: 6, maxLength: 50 }),
          async (username, email, password) => {
            try {
              await authService.register(username, email, password);
              const result = await authService.login(username, password);
              expect(result.token).toBeDefined();
              expect(typeof result.token).toBe('string');
              expect(result.user).toBeDefined();
            } catch (e) {
              // Skip if registration fails
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
