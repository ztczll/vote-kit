export type RequirementStatus = '待审核' | '投票中' | '已采纳' | '开发中' | '测试中' | '已上线' | '已拒绝';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  email_verified?: boolean;
  email_verified_at?: string | null;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  scene?: string;
  pain?: string;
  features?: string;
  extra?: string;
  category: string;
  contact_info?: string;
  status: RequirementStatus;
  submitter_id: string;
  vote_count: number;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  prototype_screenshot_url?: string | null;
}

export interface Comment {
  id: string;
  user_id: string;
  requirement_id: string;
  content: string;
  created_at: string;
  username?: string;
}

export interface VoteLimit {
  remaining: number;
  total: number;
}

export interface DevelopmentPlan {
  id: string;
  requirement_id: string;
  voting_end_date: string;
  status: 'voting' | 'development' | 'testing' | 'completed';
  created_at: string;
  updated_at: string;
  features?: PlanFeature[];
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  priority: number;
  must_have_votes: number;
  nice_to_have_votes: number;
  created_at: string;
  updated_at: string;
}

export interface DevLog {
  id: string;
  requirement_id: string;
  developer_id: string;
  developer_name?: string;
  title: string;
  content: string;
  log_type: 'feature' | 'design' | 'bugfix' | 'milestone';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface BetaApplication {
  id: string;
  requirement_id: string;
  user_id: string;
  email: string;
  device_type: string;
  available_hours: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  approved_at?: string;
}
