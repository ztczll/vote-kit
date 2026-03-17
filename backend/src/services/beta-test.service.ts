import db from '../database/db';

export class BetaTestService {
  async applyBeta(requirementId: string, userId: string, email: string, deviceType: string, availableHours: string) {
    const existing = await db('beta_applications')
      .where({ requirement_id: requirementId, user_id: userId })
      .first();

    if (existing) {
      throw new Error('您已经申请过内测');
    }

    await db('beta_applications').insert({
      requirement_id: requirementId,
      user_id: userId,
      email,
      device_type: deviceType,
      available_hours: availableHours,
      status: 'pending'
    });
  }

  async getApplications(requirementId: string) {
    const applications = await db('beta_applications')
      .where({ requirement_id: requirementId })
      .join('users', 'beta_applications.user_id', 'users.id')
      .select(
        'beta_applications.*',
        'users.username'
      )
      .orderBy('beta_applications.applied_at', 'asc');

    return applications;
  }

  async autoApprove(requirementId: string, limit: number = 20) {
    // 获取待审核的申请，按申请时间排序
    const pending = await db('beta_applications')
      .where({ requirement_id: requirementId, status: 'pending' })
      .orderBy('applied_at', 'asc')
      .limit(limit);

    if (pending.length === 0) {
      return 0;
    }

    const ids = pending.map(app => app.id);

    // 批量审批
    await db('beta_applications')
      .whereIn('id', ids)
      .update({
        status: 'approved',
        approved_at: new Date()
      });

    return pending.length;
  }

  async getMyApplication(requirementId: string, userId: string) {
    const application = await db('beta_applications')
      .where({ requirement_id: requirementId, user_id: userId })
      .first();

    return application;
  }

  async getApprovedCount(requirementId: string) {
    const result = await db('beta_applications')
      .where({ requirement_id: requirementId, status: 'approved' })
      .count('* as count')
      .first();

    return result?.count || 0;
  }
}
