import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { EditorProvider, ProjectConfig, RuleKind } from '../types.js';

const PROJECT_CONFIG_DIR = '.bitcompass';
const PROJECT_CONFIG_FILE = 'config.json';

const EDITOR_DEFAULT_PATHS: Record<EditorProvider, string> = {
  vscode: '.vscode/rules',
  cursor: '.cursor/rules',
  antigrativity: '.antigrativity/rules',
  claudecode: '.claude/rules',
};

/** Subfolder name per kind under the editor base path (e.g. .cursor/skills, .cursor/commands). */
export const KIND_SUBFOLDERS: Record<RuleKind, string> = {
  rule: 'rules',
  skill: 'skills',
  command: 'commands',
  solution: 'documentation',
};

const DEFAULT_EDITOR: EditorProvider = 'cursor';
const DEFAULT_OUTPUT_PATH = EDITOR_DEFAULT_PATHS[DEFAULT_EDITOR];

const getProjectConfigPath = (): string => {
  const cwd = process.cwd();
  return join(cwd, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);
};

export const getProjectConfigDir = (): string => join(process.cwd(), PROJECT_CONFIG_DIR);

export const getEditorDefaultPath = (editor: EditorProvider): string => EDITOR_DEFAULT_PATHS[editor];

export const loadProjectConfig = (): ProjectConfig | null => {
  const path = getProjectConfigPath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as { editor?: string; outputPath?: string };
    const editor = data.editor as EditorProvider | undefined;
    const outputPath = typeof data.outputPath === 'string' ? data.outputPath : undefined;
    if (editor && Object.keys(EDITOR_DEFAULT_PATHS).includes(editor) && outputPath) {
      return { editor, outputPath };
    }
    return null;
  } catch {
    return null;
  }
};

const ensureProjectConfigDir = (): void => {
  const dir = join(process.cwd(), PROJECT_CONFIG_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { mode: 0o755, recursive: true });
  }
};

export const saveProjectConfig = (config: ProjectConfig): void => {
  ensureProjectConfigDir();
  const path = getProjectConfigPath();
  writeFileSync(path, JSON.stringify(config, null, 2), { mode: 0o644 });
};

let warnedMissing = false;

/**
 * Returns project config, or defaults if not configured.
 * When warnIfMissing is true and no config exists, prints a small warning once to stderr and proceeds with defaults.
 */
export const getProjectConfig = (options?: { warnIfMissing?: boolean }): ProjectConfig => {
  const config = loadProjectConfig();
  if (config) return config;
  if (options?.warnIfMissing && !warnedMissing) {
    warnedMissing = true;
    process.stderr.write(
      '[bitcompass] No project config found (.bitcompass/config.json). Using defaults. Run "bitcompass init" to configure.\n'
    );
  }
  return { editor: DEFAULT_EDITOR, outputPath: DEFAULT_OUTPUT_PATH };
};

/**
 * Returns the project output directory for a given kind (rules, skills, commands, documentation).
 * Derives base from config.outputPath (e.g. .cursor/rules → base .cursor) and appends the kind subfolder.
 */
export const getOutputDirForKind = (config: ProjectConfig, kind: RuleKind): string => {
  const cwd = process.cwd();
  const basePath = dirname(config.outputPath);
  const fullBase = basePath.startsWith('/') ? basePath : join(cwd, basePath);
  return join(fullBase, KIND_SUBFOLDERS[kind]);
};

/**
 * Returns the global (user home) output directory for a kind (e.g. ~/.cursor/skills).
 * Used when pull is run with --global.
 */
export const getGlobalOutputDirForKind = (kind: RuleKind): string => {
  return join(homedir(), '.cursor', KIND_SUBFOLDERS[kind]);
};

export { EDITOR_DEFAULT_PATHS, DEFAULT_EDITOR, DEFAULT_OUTPUT_PATH };
