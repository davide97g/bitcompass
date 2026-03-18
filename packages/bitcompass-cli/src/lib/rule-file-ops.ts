import { existsSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync, lstatSync } from 'fs';
import { join, relative, dirname } from 'path';
import { getRuleById } from '../api/client.js';
import {
  getProjectConfig,
  getOutputDirForKind,
  getOutputDirsForKind,
  getGlobalOutputDirForKind,
  KIND_SUBFOLDERS,
  SPECIAL_FILE_TARGETS,
} from '../auth/project-config.js';
import { ruleFilename, solutionFilename, skillFilename, commandFilename } from './slug.js';
import { ensureRuleCached } from './rule-cache.js';
import {
  buildRuleMdcContent,
  buildSkillContent,
  buildCommandContent,
  buildSolutionContent,
} from './mdc-format.js';
import { trackDownload } from './tracking.js';

export interface PullRuleOptions {
  /** Install globally to ~/.cursor/rules/ for all projects */
  global?: boolean;
  /** Custom output path (overrides project config and global) */
  outputPath?: string;
  /** Use symbolic links instead of copying files (default: true) */
  useSymlink?: boolean;
  /** Source context for download tracking */
  source?: 'cli' | 'mcp' | 'sync';
}

/**
 * Returns the filename for a rule based on its kind.
 */
const getFilenameForKind = (rule: { kind: string; title: string; id: string }): string => {
  switch (rule.kind) {
    case 'solution':
      return solutionFilename(rule.title, rule.id);
    case 'skill':
      return skillFilename(rule.title, rule.id);
    case 'command':
      return commandFilename(rule.title, rule.id);
    case 'rule':
    default:
      return ruleFilename(rule.title, rule.id);
  }
};

/**
 * Removes an existing file or symlink at the given path.
 */
const removeExisting = (filePath: string): void => {
  if (!existsSync(filePath)) return;
  try {
    const stats = lstatSync(filePath);
    if (stats.isSymbolicLink() || stats.isFile()) {
      unlinkSync(filePath);
    }
  } catch {
    // Ignore errors when removing
  }
};

/**
 * Writes a rule to a single output file path.
 * Returns the file path written.
 */
const writeRuleToPath = (
  rule: { kind: string; title: string; id: string; body: string; description: string; globs?: string | null; always_apply?: boolean; version?: string | null },
  outDir: string,
  cachedPath: string,
  useSymlink: boolean
): string => {
  const filename = getFilenameForKind(rule);
  const filePath = join(outDir, filename);

  // Ensure parent directory exists (handles skill subdirectories like skills/my-skill/)
  mkdirSync(dirname(filePath), { recursive: true });

  removeExisting(filePath);

  // Commands and solutions: always write plain .md (no frontmatter), never symlink
  const useCopyForPlainMd = rule.kind === 'command' || rule.kind === 'solution';
  const shouldSymlink = useSymlink && !useCopyForPlainMd;

  if (shouldSymlink) {
    const relativePath = relative(dirname(filePath), cachedPath);
    try {
      symlinkSync(relativePath, filePath);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'ENOENT' || err.code === 'EXDEV') {
        symlinkSync(cachedPath, filePath);
      } else {
        throw error;
      }
    }
  } else {
    const content =
      rule.kind === 'rule'
        ? buildRuleMdcContent(rule as any)
        : rule.kind === 'skill'
          ? buildSkillContent(rule as any)
          : rule.kind === 'command'
            ? buildCommandContent(rule as any)
            : buildSolutionContent(rule as any);
    writeFileSync(filePath, content);
  }

  return filePath;
};

/**
 * Pulls a rule or solution to a file using symbolic links (like Bun init).
 * When multi-editor is configured, writes to all editor output directories.
 * When special_file_target is set, writes to the special file path instead.
 * Returns the file path where it was written/linked (first editor's path).
 * Throws if rule not found or if authentication is required.
 */
export const pullRuleToFile = async (id: string, options: PullRuleOptions = {}): Promise<string> => {
  const useSymlink = options.useSymlink !== false; // Default to true

  // Ensure rule is cached in central location
  const cachedPath = await ensureRuleCached(id);
  const rule = await getRuleById(id);
  if (!rule) {
    throw new Error(`Rule or solution with ID ${id} not found.`);
  }

  const config = getProjectConfig({ warnIfMissing: true });

  // Handle special file targets — write to project-relative path, skip multi-editor
  if (rule.special_file_target && SPECIAL_FILE_TARGETS[rule.special_file_target]) {
    const target = SPECIAL_FILE_TARGETS[rule.special_file_target];
    const cwd = process.cwd();
    const filePath = join(cwd, target.path);
    mkdirSync(dirname(filePath), { recursive: true });
    removeExisting(filePath);
    // Special files: write body only, no frontmatter
    writeFileSync(filePath, rule.body.trimEnd() + '\n');
    return filePath;
  }

  // Custom output path or global: single directory, no multi-editor
  if (options.outputPath || options.global) {
    let outDir: string;
    if (options.outputPath) {
      const base = options.outputPath.startsWith('/') ? options.outputPath : join(process.cwd(), options.outputPath);
      outDir = join(base, KIND_SUBFOLDERS[rule.kind]);
    } else {
      outDir = getGlobalOutputDirForKind(rule.kind);
    }
    mkdirSync(outDir, { recursive: true });
    return writeRuleToPath(rule, outDir, cachedPath, useSymlink);
  }

  // Multi-editor: write to all configured editor output directories
  const outDirs = getOutputDirsForKind(config, rule.kind);
  let firstPath = '';

  for (const outDir of outDirs) {
    mkdirSync(outDir, { recursive: true });
    const filePath = writeRuleToPath(rule, outDir, cachedPath, useSymlink);
    if (!firstPath) firstPath = filePath;
  }

  trackDownload(id, options.source ?? 'cli');

  return firstPath;
};
