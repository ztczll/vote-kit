export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  email_verified?: boolean;
  email_verified_at?: Date | null;
  plan?: string;
  plan_expires_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type RequirementStatus = '待审核' | '投票中' | '已采纳' | '已上线' | '已拒绝';

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
  created_at: Date;
  updated_at: Date;
  app_template_id?: string | null;
  prompt_template_ids?: string | null;
  moderation_reject_reason?: string | null;
  prototype_screenshot_url?: string | null;
}

export interface Vote {
  id: string;
  user_id: string;
  requirement_id: string;
  created_at: Date;
}

export interface Comment {
  id: string;
  user_id: string;
  requirement_id: string;
  content: string;
  created_at: Date;
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  app_id: string;
  amount: number;
  provider: 'alipay' | 'wechat';
  status: 'pending' | 'paid' | 'failed';
  transaction_id?: string;
  created_at: Date;
  paid_at?: Date;
}

export interface AnalyticsEvent {
  id: string;
  user_id?: string;
  event_type: string;
  metadata?: any;
  created_at: Date;
}

export interface StatusHistory {
  id: string;
  requirement_id: string;
  from_status: string;
  to_status: string;
  admin_id: string;
  created_at: Date;
}

export interface Developer {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  skills?: string[];
  total_earnings: number;
  completed_tasks: number;
  created_at: Date;
  updated_at: Date;
}

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at?: Date | null;
  created_ip?: string | null;
  created_user_agent?: string | null;
  created_at: Date;
}

export interface GeneratedApp {
  id: number;
  requirement_id: string;
  name: string;
  description?: string | null;
  subdomain: string;
  status: string;
  created_by: string;
  forge_task_id?: string | null;
  forge_prompt?: string | null;
  deployment_url?: string | null;
  source_file_name?: string | null;
  error_message?: string | null;
  is_public?: boolean;
  // 部署与计费相关元数据
  tokens_used?: number;
  cost_cents?: number;
  billing_status?: 'pending' | 'calculated' | 'paid' | 'free';
  deploy_mode?: 'local' | 'registry' | null;
  image_name?: string | null;
  jenkins_job_name?: string | null;
  jenkins_build_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export type TaskDifficulty = 'easy' | 'medium' | 'hard';
export type TaskStatus = 'available' | 'claimed' | 'in_progress' | 'completed' | 'launched';

export interface Task {
  id: string;
  requirement_id: string;
  title: string;
  description?: string;
  difficulty: TaskDifficulty;
  expected_earnings: number;
  status: TaskStatus;
  claimed_by?: string;
  progress: number;
  deadline?: Date;
  created_at: Date;
  updated_at: Date;
}
