export type RuleKind = 'rule' | 'documentation' | 'skill' | 'command';

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
  /** When set, rule is scoped to this Compass project. */
  project_id?: string | null;
  version?: string | null;
  /** Optional glob patterns for when the rule applies (e.g. "*.ts, *.tsx"). Used in .mdc frontmatter. */
  globs?: string | null;
  /** If true, Cursor applies this rule globally. Default false. Used in .mdc frontmatter. */
  always_apply?: boolean;
  /** 'private' = only visible to owner, 'public' = visible to everyone. Default 'private'. */
  visibility: RuleVisibility;
  /** Maps to a key in SPECIAL_FILE_TARGETS (e.g. 'claude.md'). When set, output goes to the special path. */
  special_file_target?: string | null;
  /** Optional path relative to project root for monorepo scoping (e.g. packages/frontend). */
  relative_path?: string | null;
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
  project_id?: string | null;
  version?: string;
  globs?: string | null;
  always_apply?: boolean;
  /** Default 'private'. */
  visibility?: RuleVisibility;
  /** Maps to a key in SPECIAL_FILE_TARGETS (e.g. 'claude.md'). When set, output goes to the special path. */
  special_file_target?: string | null;
  /** Optional path relative to project root for monorepo scoping. */
  relative_path?: string | null;
  /** Set to authenticated user ID on update for notification attribution. */
  updated_by?: string | null;
}

export interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: { email?: string };
}

export type EditorProvider = 'vscode' | 'cursor' | 'antigrativity' | 'claudecode';

export interface CompassProject {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type DefaultSharing = 'private' | 'public';

export interface ProjectConfig {
  editor: EditorProvider;
  /** Folder for rules/docs/commands output (e.g. .cursor/rules/) */
  outputPath: string;
  /** When set, output to all listed editors. Falls back to single `editor` field when absent. */
  editors?: EditorProvider[];
  /** Compass project this folder is associated with (null = personal only). */
  compassProjectId?: string | null;
  /** Default visibility when sharing rules/solutions. Default 'private'. */
  defaultSharing?: DefaultSharing;
  /** Schema version for migration detection. Absent in pre-0.10.2 configs. */
  configVersion?: number | string;
}

export interface BitcompassConfig {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
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

