import db from '../database/db';

const RECENT_ACTIVITIES_LIMIT = 20;

/** 仅在平台动态/最近动态中展示的需求状态（排除待审核、已拒绝） */
const PUBLIC_REQUIREMENT_STATUSES = ['投票中', '已采纳', '开发中', '测试中', '已上线'];

export interface CategoryDistributionItem {
  label: string;
  value: number;
  percentage: number;
}

export interface RecentActivity {
  type: 'vote' | 'submit' | 'comment' | 'launched';
  username: string;
  target: string;
  time: string;
  requirement_id?: string;
}

export interface HomeStats {
  activeVotingCount: number;
  totalRequirements: number;
  weeklyResolutionRate: number;
  categoryDistribution: CategoryDistributionItem[];
  recentActivities: RecentActivity[];
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export class StatsService {
  async getHomeStats(): Promise<HomeStats> {
    const [activeVotingCount, totalRequirements, categoryRows, weeklyResolved, weeklyTotal, voteActivities, submitActivities, commentActivities, launchedActivities] = await Promise.all([
      this.getActiveVotingCount(),
      this.getTotalRequirements(),
      this.getCategoryDistribution(),
      this.getWeeklyResolvedCount(),
      this.getWeeklyStatusChangeCount(),
      this.getRecentVoteActivities(),
      this.getRecentSubmitActivities(),
      this.getRecentCommentActivities(),
      this.getRecentLaunchedActivities(),
    ]);

    const weeklyResolutionRate =
      weeklyTotal > 0 ? Math.round((weeklyResolved / weeklyTotal) * 100) : 0;

    const categorySum = categoryRows.reduce((s, r) => s + r.value, 0);
    const categoryDistribution: CategoryDistributionItem[] = categoryRows.map((r) => ({
      label: r.label,
      value: r.value,
      percentage: categorySum > 0 ? Math.round((r.value / categorySum) * 100) : 0,
    }));

    const recentActivities = this.mergeRecentActivities(
      voteActivities,
      submitActivities,
      commentActivities,
      launchedActivities
    ).slice(0, RECENT_ACTIVITIES_LIMIT);

    return {
      activeVotingCount,
      totalRequirements,
      weeklyResolutionRate,
      categoryDistribution,
      recentActivities,
    };
  }

  private async getActiveVotingCount(): Promise<number> {
    const r = await db('requirements').where({ status: '投票中' }).count('* as count').first();
    return Number(r?.count ?? 0);
  }

  private async getTotalRequirements(): Promise<number> {
    const r = await db('requirements').count('* as count').first();
    return Number(r?.count ?? 0);
  }

  private async getCategoryDistribution(): Promise<{ label: string; value: number }[]> {
    const rows = await db('requirements')
      .select('category as label')
      .sum('vote_count as value')
      .groupBy('category');
    return (rows || []).map((r: any) => ({
      label: r.label || '其他',
      value: Number(r.value ?? 0),
    }));
  }

  private async getWeeklyResolvedCount(): Promise<number> {
    const start = startOfWeek(new Date());
    const r = await db('status_history')
      .where('created_at', '>=', start)
      .whereIn('to_status', ['已采纳', '已上线'])
      .countDistinct('requirement_id as count')
      .first();
    return Number(r?.count ?? 0);
  }

  private async getWeeklyStatusChangeCount(): Promise<number> {
    const start = startOfWeek(new Date());
    const r = await db('status_history')
      .where('created_at', '>=', start)
      .countDistinct('requirement_id as count')
      .first();
    return Number(r?.count ?? 0);
  }

  private async getRecentVoteActivities(): Promise<RecentActivity[]> {
    const rows = await db('votes')
      .join('users', 'votes.user_id', 'users.id')
      .join('requirements', 'votes.requirement_id', 'requirements.id')
      .whereIn('requirements.status', PUBLIC_REQUIREMENT_STATUSES)
      .select('users.username', 'requirements.title as target', 'votes.created_at as time', 'requirements.id as requirement_id')
      .orderBy('votes.created_at', 'desc')
      .limit(RECENT_ACTIVITIES_LIMIT);
    return (rows || []).map((r: any) => ({
      type: 'vote' as const,
      username: r.username || '用户',
      target: r.target || '',
      time: r.time ? new Date(r.time).toISOString() : new Date().toISOString(),
      requirement_id: r.requirement_id,
    }));
  }

  private async getRecentSubmitActivities(): Promise<RecentActivity[]> {
    const rows = await db('requirements')
      .join('users', 'requirements.submitter_id', 'users.id')
      .whereIn('requirements.status', PUBLIC_REQUIREMENT_STATUSES)
      .select('users.username', 'requirements.title as target', 'requirements.created_at as time', 'requirements.id as requirement_id')
      .orderBy('requirements.created_at', 'desc')
      .limit(RECENT_ACTIVITIES_LIMIT);
    return (rows || []).map((r: any) => ({
      type: 'submit' as const,
      username: r.username || '用户',
      target: r.target || '',
      time: r.time ? new Date(r.time).toISOString() : new Date().toISOString(),
      requirement_id: r.requirement_id,
    }));
  }

  private async getRecentCommentActivities(): Promise<RecentActivity[]> {
    const rows = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .join('requirements', 'comments.requirement_id', 'requirements.id')
      .whereIn('requirements.status', PUBLIC_REQUIREMENT_STATUSES)
      .select('users.username', 'requirements.title as target', 'comments.created_at as time', 'comments.requirement_id')
      .orderBy('comments.created_at', 'desc')
      .limit(RECENT_ACTIVITIES_LIMIT);
    return (rows || []).map((r: any) => ({
      type: 'comment' as const,
      username: r.username || '用户',
      target: r.target || '',
      time: r.time ? new Date(r.time).toISOString() : new Date().toISOString(),
      requirement_id: r.requirement_id,
    }));
  }

  private async getRecentLaunchedActivities(): Promise<RecentActivity[]> {
    const rows = await db('status_history')
      .where('to_status', '已上线')
      .join('requirements', 'status_history.requirement_id', 'requirements.id')
      .join('users', 'requirements.submitter_id', 'users.id')
      .select(
        'users.username',
        'requirements.title as target',
        'status_history.created_at as time',
        'requirements.id as requirement_id'
      )
      .orderBy('status_history.created_at', 'desc')
      .limit(RECENT_ACTIVITIES_LIMIT);
    return (rows || []).map((r: any) => ({
      type: 'launched' as const,
      username: r.username || '用户',
      target: r.target || '',
      time: r.time ? new Date(r.time).toISOString() : new Date().toISOString(),
      requirement_id: r.requirement_id,
    }));
  }

  private mergeRecentActivities(
    vote: RecentActivity[],
    submit: RecentActivity[],
    comment: RecentActivity[],
    launched: RecentActivity[]
  ): RecentActivity[] {
    const combined = [
      ...vote.map((a) => ({ ...a, ts: new Date(a.time).getTime() })),
      ...submit.map((a) => ({ ...a, ts: new Date(a.time).getTime() })),
      ...comment.map((a) => ({ ...a, ts: new Date(a.time).getTime() })),
      ...launched.map((a) => ({ ...a, ts: new Date(a.time).getTime() })),
    ];
    combined.sort((a, b) => b.ts - a.ts);
    return combined.map(({ ts, ...a }) => a);
  }
}
