export type RuleKind = 'rule' | 'solution' | 'skill' | 'command';

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
  version?: string | null;
  /** Optional glob patterns for when the rule applies (e.g. "*.ts, *.tsx"). Used in .mdc frontmatter. */
  globs?: string | null;
  /** If true, Cursor applies this rule globally. Default false. Used in .mdc frontmatter. */
  always_apply?: boolean;
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
  version?: string;
  globs?: string | null;
  always_apply?: boolean;
}
