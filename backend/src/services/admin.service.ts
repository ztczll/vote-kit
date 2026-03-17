import db from '../database/db';
import { addCredits } from './credits.service';

function currentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export class AdminService {
  async getDashboard() {
    const totalUsers = await db('users').count('* as count').first();
    const totalRequirements = await db('requirements').count('* as count').first();
    const totalVotes = await db('votes').count('* as count').first();

    const requirementsByStatus = await db('requirements')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyActiveUsers = await db('votes')
      .where('created_at', '>=', today)
      .countDistinct('user_id as count')
      .first();

    const out: Record<string, any> = {
      totalUsers: totalUsers?.count || 0,
      totalRequirements: totalRequirements?.count || 0,
      totalVotes: totalVotes?.count || 0,
      requirementsByStatus: requirementsByStatus.reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      dailyActiveUsers: dailyActiveUsers?.count || 0,
    };

    try {
      const usersByPlan = await db('users').select('plan').count('* as count').groupBy('plan');
      out.usersByPlan = usersByPlan.reduce((acc: Record<string, number>, row: any) => {
        acc[row.plan || 'free'] = row.count;
        return acc;
      }, {});
    } catch {
      // plan column may not exist before migration
    }

    try {
      const paid = await db('subscriptions').where({ status: 'paid' }).sum('amount as total').first();
      out.subscriptionRevenue = paid?.total || 0;
    } catch {
      out.subscriptionRevenue = 0;
    }

    try {
      const taskCounts = await db('gen_tasks').select('status').count('* as count').groupBy('status');
      out.genTasksByStatus = taskCounts.reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = row.count;
        return acc;
      }, {});
    } catch {
      // gen_tasks may not exist
    }

    return out;
  }

  /** 待审核：仅展示未带 AI 拒绝原因的需求（供人工复核） */
  async getPendingRequirements() {
    return await db('requirements')
      .where({ status: '待审核' })
      .andWhere((qb) => qb.whereNull('moderation_reject_reason').orWhere('moderation_reject_reason', '=', ''))
      .orderBy('created_at', 'desc');
  }

  /** AI 内容审核未通过：待审核且存在拒绝原因，供管理员删除或人工通过 */
  async getAiRejectedRequirements() {
    return await db('requirements')
      .where({ status: '待审核' })
      .whereNotNull('moderation_reject_reason')
      .where('moderation_reject_reason', '!=', '')
      .orderBy('created_at', 'desc');
  }

  async getActiveRequirements() {
    const requirements = await db('requirements')
      .whereIn('status', ['投票中', '已采纳', '开发中', '测试中'])
      .select('requirements.*')
      .orderBy('requirements.vote_count', 'desc');

    // 手动关联负责人信息（可能是用户或开发者）
    for (const req of requirements) {
      if (req.assigned_to) {
        if (req.assigned_to_type === 'developer') {
          const dev = await db('developers').where({ id: req.assigned_to }).first();
          req.assigned_username = dev ? dev.name : null;
        } else {
          const user = await db('users').where({ id: req.assigned_to }).first();
          req.assigned_username = user ? user.username : null;
        }
      }
    }

    return requirements;
  }

  /** 用户列表（支持与额度管理），分页、按套餐筛选 */
  async getUsersForSupport(opts: { plan?: string; page: number; pageSize: number }) {
    const { plan, page = 1, pageSize = 20 } = opts;
    const month = currentMonth();

    let query = db('users')
      .select('users.id', 'users.username', 'users.email', 'users.plan', 'users.plan_expires_at', 'users.created_at')
      .leftJoin('user_usage', function () {
        this.on('user_usage.user_id', '=', 'users.id').andOn('user_usage.month', '=', db.raw('?', [month]));
      })
      .leftJoin('user_credits', function () {
        this.on('user_credits.user_id', '=', 'users.id').andOn('user_credits.month', '=', db.raw('?', [month]));
      })
      .select(
        'user_usage.requirement_prototype_count',
        'user_usage.code_generation_count',
        'user_credits.credits_balance'
      );

    if (plan) {
      query = query.where('users.plan', plan);
    }

    const countQuery = db('users');
    if (plan) {
      countQuery.where('users.plan', plan);
    }
    const total = await countQuery.count('* as count').first();
    const users = await query
      .orderBy('users.created_at', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      users: users.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        plan: u.plan || 'free',
        plan_expires_at: u.plan_expires_at,
        created_at: u.created_at,
        requirement_prototype_count: u.requirement_prototype_count ?? 0,
        code_generation_count: u.code_generation_count ?? 0,
        credits_balance: u.credits_balance ?? 0,
      })),
      total: Number(total?.count ?? 0),
      page,
      pageSize,
    };
  }

  /** 管理员调整用户额度 / Credits */
  async adjustUserQuota(
    userId: string,
    body: { creditsDelta?: number }
  ): Promise<void> {
    const delta = Number(body.creditsDelta ?? 0);
    if (!delta) return;
    await addCredits(userId, delta, 'admin_adjust', {
      reason: 'admin_adjust_quota',
    });
  }

  async getAllUsers() {
    const developers = await db('developers').select('id', 'name', 'email');
    return developers.map((d: any) => ({ ...d, type: 'developer', displayName: `${d.name} (开发者)` }));
  }

  /**
   * 获取全部 AI 生成应用的账单数据（按需求维度：tokens、费用），供管理后台使用。
   */
  async getGeneratedAppsBilling(filters?: { status?: string; billing_status?: string }) {
    let query = db('generated_apps')
      .select(
        'generated_apps.id',
        'generated_apps.requirement_id',
        'generated_apps.name',
        'generated_apps.status',
        'generated_apps.tokens_used',
        'generated_apps.cost_cents',
        'generated_apps.billing_status',
        'generated_apps.created_by',
        'generated_apps.created_at',
        db.raw('requirements.title as requirement_title'),
        db.raw('users.username as creator_username')
      )
      .leftJoin('requirements', 'generated_apps.requirement_id', 'requirements.id')
      .leftJoin('users', 'generated_apps.created_by', 'users.id')
      .orderBy('generated_apps.created_at', 'desc');

    if (filters?.status) {
      query = query.where('generated_apps.status', filters.status);
    }
    if (filters?.billing_status) {
      query = query.where('generated_apps.billing_status', filters.billing_status);
    }

    const list = await query;

    const totalTasks = list.length;
    const totalTokens = list.reduce((sum, row) => sum + (Number(row.tokens_used) || 0), 0);
    const totalCostCents = list.reduce((sum, row) => sum + (Number(row.cost_cents) || 0), 0);

    return {
      data: list,
      summary: { totalTasks, totalTokens, totalCostCents },
    };
  }
}
