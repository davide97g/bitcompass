import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { EditorProvider, ProjectConfig, RuleKind } from '../types.js';

const PROJECT_CONFIG_DIR = '.bitcompass';
const PROJECT_CONFIG_FILE = 'config.json';

/**
 * Walks from cwd up to filesystem root looking for .bitcompass/config.json.
 * Returns the directory containing it, or null if not found.
 */
export const findProjectRoot = (): string | null => {
  let current = process.cwd();
  while (true) {
    if (existsSync(join(current, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break; // reached filesystem root
    current = parent;
  }
  return null;
};

let cachedProjectRoot: string | null = null;

/**
 * Returns the project root (directory containing .bitcompass/config.json),
 * falling back to cwd when no config exists (e.g. during `bitcompass init`).
 * Result is memoized for the process lifetime.
 */
export const getProjectRoot = (): string => {
  if (cachedProjectRoot === null) {
    cachedProjectRoot = findProjectRoot() ?? process.cwd();
  }
  return cachedProjectRoot;
};

export const resetProjectRootCache = (): void => {
  cachedProjectRoot = null;
};

const EDITOR_DEFAULT_PATHS: Record<EditorProvider, string> = {
  vscode: '.vscode/rules',
  cursor: '.cursor/rules',
  antigrativity: '.antigrativity/rules',
  claudecode: '.claude/rules',
};

/** Editor base path (without /rules suffix) for each provider. */
export const EDITOR_BASE_PATHS: Record<EditorProvider, string> = {
  cursor: '.cursor/',
  claudecode: '.claude/',
  vscode: '.vscode/',
  antigrativity: '.antigrativity/',
};

/** Subfolder name per kind under the editor base path (e.g. .cursor/skills, .cursor/commands). */
export const KIND_SUBFOLDERS: Record<RuleKind, string> = {
  rule: 'rules',
  skill: 'skills',
  command: 'commands',
  solution: 'documentation',
};

/** Special file output targets with hardcoded project-relative paths. */
export const SPECIAL_FILE_TARGETS: Record<string, { path: string; description: string }> = {
  'claude.md': { path: 'CLAUDE.md', description: 'Claude Code project instructions' },
  'agents.md': { path: 'AGENTS.md', description: 'OpenAI Codex instructions' },
  'cursorrules': { path: '.cursorrules', description: 'Cursor legacy rules' },
  'copilot-instructions': { path: '.github/copilot-instructions.md', description: 'GitHub Copilot instructions' },
  'windsurfrules': { path: '.windsurfrules', description: 'Windsurf rules' },
};

/** Bump this when file layout changes require migration. */
export const CURRENT_CONFIG_VERSION = 1;

const DEFAULT_EDITOR: EditorProvider = 'cursor';
const DEFAULT_OUTPUT_PATH = EDITOR_DEFAULT_PATHS[DEFAULT_EDITOR];

const getProjectConfigPath = (): string => {
  return join(getProjectRoot(), PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);
};

export const getProjectConfigDir = (): string => join(getProjectRoot(), PROJECT_CONFIG_DIR);

export const getEditorDefaultPath = (editor: EditorProvider): string => EDITOR_DEFAULT_PATHS[editor];

export const loadProjectConfig = (): ProjectConfig | null => {
  const path = getProjectConfigPath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as {
      editor?: string;
      editors?: string[];
      outputPath?: string;
      compassProjectId?: string | null;
      defaultSharing?: string;
      configVersion?: number;
    };
    const editor = data.editor as EditorProvider | undefined;
    const outputPath = typeof data.outputPath === 'string' ? data.outputPath : undefined;
    if (editor && Object.keys(EDITOR_DEFAULT_PATHS).includes(editor) && outputPath) {
      const compassProjectId =
        data.compassProjectId === undefined || data.compassProjectId === null
          ? null
          : typeof data.compassProjectId === 'string'
            ? data.compassProjectId
            : null;
      const defaultSharing =
        data.defaultSharing === 'public' ? 'public' as const : 'private' as const;
      const editors = Array.isArray(data.editors)
        ? (data.editors as string[]).filter((e): e is EditorProvider =>
            Object.keys(EDITOR_DEFAULT_PATHS).includes(e)
          )
        : undefined;
      const configVersion = typeof data.configVersion === 'number' ? data.configVersion : undefined;
      return { editor, outputPath, editors: editors?.length ? editors : undefined, compassProjectId, defaultSharing, configVersion };
    }
    return null;
  } catch {
    return null;
  }
};

const ensureProjectConfigDir = (): void => {
  const dir = join(getProjectRoot(), PROJECT_CONFIG_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { mode: 0o755, recursive: true });
  }
};

export const saveProjectConfig = (config: ProjectConfig): void => {
  ensureProjectConfigDir();
  const path = getProjectConfigPath();
  const toWrite = { ...config, configVersion: config.configVersion ?? CURRENT_CONFIG_VERSION };
  writeFileSync(path, JSON.stringify(toWrite, null, 2), { mode: 0o644 });
};

let warnedMissing = false;
let warnedMigration = false;

/**
 * Returns project config, or defaults if not configured.
 * When warnIfMissing is true and no config exists, prints a small warning once to stderr and proceeds with defaults.
 */
export const getProjectConfig = (options?: { warnIfMissing?: boolean }): ProjectConfig => {
  const config = loadProjectConfig();
  if (config) {
    if (
      !warnedMigration &&
      (config.configVersion === undefined || config.configVersion < CURRENT_CONFIG_VERSION) &&
      process.stderr.isTTY
    ) {
      warnedMigration = true;
      process.stderr.write(
        '[bitcompass] Project config is from an older version. Run "bitcompass migrate" to update file layout.\n'
      );
    }
    return config;
  }
  if (options?.warnIfMissing && !warnedMissing) {
    warnedMissing = true;
    process.stderr.write(
      '[bitcompass] No project config found (.bitcompass/config.json). Using defaults. Run "bitcompass init" to configure.\n'
    );
  }
  return { editor: DEFAULT_EDITOR, outputPath: DEFAULT_OUTPUT_PATH, compassProjectId: null };
};

/**
 * Returns the project output directory for a given kind (rules, skills, commands, documentation).
 * Derives base from config.outputPath (e.g. .cursor/rules → base .cursor) and appends the kind subfolder.
 */
export const getOutputDirForKind = (config: ProjectConfig, kind: RuleKind): string => {
  const root = getProjectRoot();
  const basePath = dirname(config.outputPath);
  const fullBase = basePath.startsWith('/') ? basePath : join(root, basePath);
  return join(fullBase, KIND_SUBFOLDERS[kind]);
};

/**
 * Returns the project output directories for a given kind across all configured editors.
 * When `editors` is set, returns one dir per editor; otherwise falls back to single `editor` path.
 */
export const getOutputDirsForKind = (config: ProjectConfig, kind: RuleKind): string[] => {
  const root = getProjectRoot();
  const editors = config.editors?.length ? config.editors : [config.editor];
  return editors.map((editor) => {
    const basePath = EDITOR_BASE_PATHS[editor];
    return join(root, basePath, KIND_SUBFOLDERS[kind]);
  });
};

/**
 * Returns the global (user home) output directory for a kind (e.g. ~/.cursor/skills).
 * Used when pull is run with --global.
 */
export const getGlobalOutputDirForKind = (kind: RuleKind): string => {
  return join(homedir(), '.cursor', KIND_SUBFOLDERS[kind]);
};

export { EDITOR_DEFAULT_PATHS, DEFAULT_EDITOR, DEFAULT_OUTPUT_PATH };
