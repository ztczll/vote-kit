import api from './client';

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

export const statsApi = {
  getStats() {
    return api.get<HomeStats>('/stats');
  },
};
