import { existsSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync, lstatSync } from 'fs';
import { join, relative, dirname } from 'path';
import { homedir } from 'os';
import { getRuleById } from '../api/client.js';
import { getProjectConfig } from '../auth/project-config.js';
import { ruleFilename, solutionFilename, skillFilename, commandFilename } from './slug.js';
import { ensureRuleCached } from './rule-cache.js';
import { buildRuleMdcContent, buildMarkdownWithKind } from './mdc-format.js';

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

  let outDir: string;
  if (options.outputPath) {
    // Custom output path takes precedence
    outDir = options.outputPath.startsWith('/') ? options.outputPath : join(process.cwd(), options.outputPath);
  } else if (options.global) {
    // Use global location: ~/.cursor/rules/
    outDir = join(homedir(), '.cursor', 'rules');
  } else {
    // Use project config (default behavior)
    const { outputPath } = getProjectConfig({ warnIfMissing: true });
    outDir = join(process.cwd(), outputPath);
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

  if (useSymlink) {
    // Create symbolic link to cached file
    // Use relative path for portability
    const relativePath = relative(dirname(filename), cachedPath);
    try {
      symlinkSync(relativePath, filename);
    } catch (error: any) {
      // Fallback to absolute path if relative fails (e.g., on Windows or cross-filesystem)
      if (error.code === 'ENOENT' || error.code === 'EXDEV') {
        symlinkSync(cachedPath, filename);
      } else {
        throw error;
      }
    }
  } else {
    // Fallback: copy file content (rules as .mdc with full frontmatter, others as .md with kind in frontmatter for round-trip)
    const content =
      rule.kind === 'rule'
        ? buildRuleMdcContent(rule)
        : buildMarkdownWithKind(rule);
    writeFileSync(filename, content);
  }

  return filename;
};
