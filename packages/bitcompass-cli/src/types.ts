export type RuleKind = 'rule' | 'solution';

export interface Rule {
  id: string;
  kind: RuleKind;
  title: string;
  description: string;
  body: string;
  context?: string | null;
  examples?: string[];
  technologies?: string[];
  user_id: string;
  author_display_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleInsert {
  kind: RuleKind;
  title: string;
  description: string;
  body: string;
  context?: string | null;
  examples?: string[];
  technologies?: string[];
}

export interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: { email?: string };
}

export interface BitcompassConfig {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export type ActivityLogTimeFrame = 'day' | 'week' | 'month';

export interface ActivityLogInsert {
  time_frame: ActivityLogTimeFrame;
  period_start: string;
  period_end: string;
  repo_summary: Record<string, unknown>;
  git_analysis: Record<string, unknown>;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  time_frame: ActivityLogTimeFrame;
  period_start: string;
  period_end: string;
  repo_summary: Record<string, unknown>;
  git_analysis: Record<string, unknown>;
  created_at: string;
}
