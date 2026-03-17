import db from '../database/db';

export class DevPlanService {
  async createPlan(requirementId: string) {
    const votingEndDate = new Date();
    votingEndDate.setDate(votingEndDate.getDate() + 7); // 7天投票期

    const [id] = await db('development_plans').insert({
      requirement_id: requirementId,
      voting_end_date: votingEndDate,
      status: 'voting'
    });

    return await db('development_plans').where({ requirement_id: requirementId }).first();
  }

  async addFeature(planId: string, title: string, description: string, priority: number = 0) {
    await db('plan_features').insert({
      plan_id: planId,
      title,
      description,
      priority
    });
  }

  async voteFeature(featureId: string, userId: string, voteType: 'must_have' | 'nice_to_have') {
    // 检查是否已投票
    const existing = await db('feature_votes')
      .where({ feature_id: featureId, user_id: userId })
      .first();

    if (existing) {
      // 更新投票类型
      await db('feature_votes')
        .where({ feature_id: featureId, user_id: userId })
        .update({ vote_type: voteType });
    } else {
      // 新增投票
      await db('feature_votes').insert({
        feature_id: featureId,
        user_id: userId,
        vote_type: voteType
      });
    }

    // 更新票数统计
    await this.updateFeatureVotes(featureId);
  }

  private async updateFeatureVotes(featureId: string) {
    const mustHaveCount = await db('feature_votes')
      .where({ feature_id: featureId, vote_type: 'must_have' })
      .count('* as count')
      .first();

    const niceToHaveCount = await db('feature_votes')
      .where({ feature_id: featureId, vote_type: 'nice_to_have' })
      .count('* as count')
      .first();

    await db('plan_features')
      .where({ id: featureId })
      .update({
        must_have_votes: mustHaveCount?.count || 0,
        nice_to_have_votes: niceToHaveCount?.count || 0
      });
  }

  async getVotingResults(planId: string) {
    const features = await db('plan_features')
      .where({ plan_id: planId })
      .orderBy('must_have_votes', 'desc');

    return features;
  }

  async getPlanByRequirement(requirementId: string) {
    console.log('🔍 getPlanByRequirement called with:', requirementId);
    
    const plan = await db('development_plans')
      .where({ requirement_id: requirementId })
      .first();

    console.log('📋 Found plan:', plan);

    if (!plan) return null;

    const features = await db('plan_features')
      .where({ plan_id: plan.id })
      .orderBy('priority', 'asc');

    console.log('✨ Found features:', features.length);

    return { ...plan, features };
  }

  async getUserVotes(planId: string, userId: string) {
    const features = await db('plan_features')
      .where({ plan_id: planId })
      .select('id');

    const featureIds = features.map(f => f.id);

    const votes = await db('feature_votes')
      .whereIn('feature_id', featureIds)
      .where({ user_id: userId });

    return votes.reduce((acc, vote) => {
      acc[vote.feature_id] = vote.vote_type;
      return acc;
    }, {} as Record<string, string>);
  }
}
