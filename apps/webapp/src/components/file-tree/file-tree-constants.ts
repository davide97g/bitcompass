import type { RuleKind } from '@/types/bitcompass';

// ---------------------------------------------------------------------------
// Editor providers
// ---------------------------------------------------------------------------

export type EditorProvider = 'cursor' | 'claudecode' | 'vscode' | 'antigrativity';

export const EDITOR_BASE_PATHS: Record<EditorProvider, string> = {
  cursor: '.cursor/',
  claudecode: '.claude/',
  vscode: '.vscode/',
  antigrativity: '.antigrativity/',
};

// ---------------------------------------------------------------------------
// Kind → subfolder mapping (mirrors CLI output structure)
// ---------------------------------------------------------------------------

export const KIND_SUBFOLDERS: Record<RuleKind, string> = {
  rule: 'rules',
  skill: 'skills',
  command: 'commands',
  solution: 'documentation',
};

// ---------------------------------------------------------------------------
// Special file targets (editor-agnostic top-level files)
// ---------------------------------------------------------------------------

export const SPECIAL_FILE_TARGETS: Record<string, { path: string; description: string }> = {
  'claude.md': { path: 'CLAUDE.md', description: 'Claude Code project instructions' },
  'agents.md': { path: 'AGENTS.md', description: 'Agents meta-prompt' },
  cursorrules: { path: '.cursorrules', description: 'Legacy Cursor rules file' },
  'copilot-instructions': {
    path: '.github/copilot-instructions.md',
    description: 'GitHub Copilot instructions',
  },
  windsurfrules: { path: '.windsurfrules', description: 'Windsurf rules file' },
};

// ---------------------------------------------------------------------------
// Color mappings (Tailwind classes)
// ---------------------------------------------------------------------------

export interface KindColorSet {
  folder: string;
  file: string;
  badge: string;
  glow: string;
}

export const KIND_COLORS: Record<RuleKind, KindColorSet> = {
  rule: {
    folder: 'text-sky-400',
    file: 'text-sky-300',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    glow: 'shadow-sky-500/10',
  },
  skill: {
    folder: 'text-violet-400',
    file: 'text-violet-300',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    glow: 'shadow-violet-500/10',
  },
  command: {
    folder: 'text-amber-400',
    file: 'text-amber-300',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'shadow-amber-500/10',
  },
  solution: {
    folder: 'text-emerald-400',
    file: 'text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
  },
};

export const SPECIAL_FILE_COLOR: KindColorSet = {
  folder: 'text-orange-400',
  file: 'text-orange-300',
  badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  glow: 'shadow-orange-500/10',
};

// ---------------------------------------------------------------------------
// Card kind classes (extracted from CompassProjectDetailPage)
// ---------------------------------------------------------------------------

export const CARD_KIND_CLASSES: Record<RuleKind, { card: string; cta: string }> = {
  rule: {
    card: 'dark:border-l-sky-500/30 dark:hover:shadow-sky-500/10',
    cta: 'bg-sky-700 hover:bg-sky-600 text-white dark:bg-sky-700 dark:hover:bg-sky-600',
  },
  solution: {
    card: 'dark:border-l-emerald-500/30 dark:hover:shadow-emerald-500/10',
    cta: 'bg-emerald-700 hover:bg-emerald-600 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600',
  },
  skill: {
    card: 'dark:border-l-violet-500/30 dark:hover:shadow-violet-500/10',
    cta: 'bg-violet-700 hover:bg-violet-600 text-white dark:bg-violet-700 dark:hover:bg-violet-600',
  },
  command: {
    card: 'dark:border-l-amber-500/30 dark:hover:shadow-amber-500/10',
    cta: 'bg-amber-700 hover:bg-amber-600 text-white dark:bg-amber-700 dark:hover:bg-amber-600',
  },
};

// ---------------------------------------------------------------------------
// parseProjectEditor
// ---------------------------------------------------------------------------

const VALID_EDITORS = new Set<EditorProvider>(['cursor', 'claudecode', 'vscode', 'antigrativity']);

export function parseProjectEditor(
  config: Record<string, unknown> | null | undefined,
): EditorProvider {
  const raw = config?.editor;
  if (typeof raw === 'string' && VALID_EDITORS.has(raw as EditorProvider)) {
    return raw as EditorProvider;
  }
  return 'cursor';
}

// ---------------------------------------------------------------------------
// Tree data structures
// ---------------------------------------------------------------------------

export interface TreeFile {
  ruleId: string;
  filename: string;
  title: string;
  kind: RuleKind;
}

export interface TreeFolder {
  name: string;
  kind: RuleKind;
  files: TreeFile[];
}

export interface FileTree {
  editorBase: string;
  editor: EditorProvider;
  folders: TreeFolder[];
  specialFiles: TreeFile[];
  stats: {
    totalFiles: number;
    totalFolders: number;
    totalSpecialFiles: number;
  };
}
