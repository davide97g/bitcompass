import { existsSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync, lstatSync } from 'fs';
import { join, relative, dirname } from 'path';
import { getRuleById } from '../api/client.js';
import {
  getProjectConfig,
  getOutputDirForKind,
  getGlobalOutputDirForKind,
  KIND_SUBFOLDERS,
} from '../auth/project-config.js';
import { ruleFilename, solutionFilename, skillFilename, commandFilename } from './slug.js';
import { ensureRuleCached } from './rule-cache.js';
import {
  buildRuleMdcContent,
  buildSkillContent,
  buildCommandContent,
  buildSolutionContent,
} from './mdc-format.js';

export interface PullRuleOptions {
  /** Install globally to ~/.cursor/rules/ for all projects */
  global?: boolean;
  /** Custom output path (overrides project config and global) */
  outputPath?: string;
  /** Use symbolic links instead of copying files (default: true) */
  useSymlink?: boolean;
}

/**
 * Pulls a rule or solution to a file using symbolic links (like Bun init).
 * Returns the file path where it was written/linked.
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
  let outDir: string;
  if (options.outputPath) {
    // Custom output path: treat as base, append kind subfolder
    const base = options.outputPath.startsWith('/') ? options.outputPath : join(process.cwd(), options.outputPath);
    outDir = join(base, KIND_SUBFOLDERS[rule.kind]);
  } else if (options.global) {
    outDir = getGlobalOutputDirForKind(rule.kind);
  } else {
    outDir = getOutputDirForKind(config, rule.kind);
  }

  mkdirSync(outDir, { recursive: true });

  let filename: string;
  switch (rule.kind) {
    case 'solution':
      filename = join(outDir, solutionFilename(rule.title, rule.id));
      break;
    case 'skill':
      filename = join(outDir, skillFilename(rule.title, rule.id));
      break;
    case 'command':
      filename = join(outDir, commandFilename(rule.title, rule.id));
      break;
    case 'rule':
    default:
      filename = join(outDir, ruleFilename(rule.title, rule.id));
      break;
  }

  // Remove existing file/symlink if it exists
  if (existsSync(filename)) {
    try {
      const stats = lstatSync(filename);
      if (stats.isSymbolicLink() || stats.isFile()) {
        unlinkSync(filename);
      }
    } catch {
      // Ignore errors when removing
    }
  }

  // Commands and solutions: always write plain .md (no frontmatter), never symlink
  const useCopyForPlainMd = rule.kind === 'command' || rule.kind === 'solution';
  const shouldSymlink = useSymlink && !useCopyForPlainMd;

  if (shouldSymlink) {
    const relativePath = relative(dirname(filename), cachedPath);
    try {
      symlinkSync(relativePath, filename);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'ENOENT' || err.code === 'EXDEV') {
        symlinkSync(cachedPath, filename);
      } else {
        throw error;
      }
    }
  } else {
    const content =
      rule.kind === 'rule'
        ? buildRuleMdcContent(rule)
        : rule.kind === 'skill'
          ? buildSkillContent(rule)
          : rule.kind === 'command'
            ? buildCommandContent(rule)
            : buildSolutionContent(rule);
    writeFileSync(filename, content);
  }

  return filename;
};
