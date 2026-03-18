export type RuleKind = 'rule' | 'solution' | 'skill' | 'command';

export type RuleVisibility = 'private' | 'public';

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
  /** When set, rule is scoped to this Compass project; only project members can see/edit. */
  project_id?: string | null;
  version?: string | null;
  /** Optional glob patterns for when the rule applies (e.g. "*.ts, *.tsx"). Used in .mdc frontmatter. */
  globs?: string | null;
  /** If true, Cursor applies this rule globally. Default false. Used in .mdc frontmatter. */
  always_apply?: boolean;
  /** 'private' = only visible to owner, 'public' = visible to everyone. Default 'private'. */
  visibility: RuleVisibility;
  /** Maps to a special output file (e.g. 'claude.md' → CLAUDE.md). */
  special_file_target?: string | null;
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
  /** When set, rule is scoped to this Compass project. */
  project_id?: string | null;
  version?: string;
  globs?: string | null;
  always_apply?: boolean;
  /** Default 'private'. */
  visibility?: RuleVisibility;
  /** Maps to a special output file (e.g. 'claude.md' → CLAUDE.md). */
  special_file_target?: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface CompassProject {
  id: string;
  title: string;
  description: string;
  created_by: string | null;
  /** Shared project config (pushed via `bitcompass config push`). */
  config?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CompassProjectMember {
  project_id: string;
  user_id: string;
}

export interface RuleGroup {
  id: string;
  title: string;
  description: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface RuleGroupItem {
  group_id: string;
  rule_id: string;
  added_at: string;
}

export interface Download {
  id: string;
  rule_id: string;
  user_id: string;
  editor: string | null;
  compass_project_id: string | null;
  source: 'cli' | 'mcp' | 'sync';
  created_at: string;
}
