import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getRuleById } from '../api/client.js';
import { getProjectConfig } from '../auth/project-config.js';
import { ruleFilename, solutionFilename } from './slug.js';
import type { Rule } from '../types.js';

export interface PullRuleOptions {
  /** Install globally to ~/.cursor/rules/ for all projects */
  global?: boolean;
  /** Custom output path (overrides project config and global) */
  outputPath?: string;
}

/**
 * Pulls a rule or solution to a file. Returns the file path where it was written.
 * Throws if rule not found or if authentication is required.
 */
export const pullRuleToFile = async (id: string, options: PullRuleOptions = {}): Promise<string> => {
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

  const filename =
    rule.kind === 'solution'
      ? join(outDir, solutionFilename(rule.title, rule.id))
      : join(outDir, ruleFilename(rule.title, rule.id));

  const content =
    rule.kind === 'solution'
      ? `# ${rule.title}\n\n${rule.description}\n\n## Solution\n\n${rule.body}\n`
      : `# ${rule.title}\n\n${rule.description}\n\n${rule.body}\n`;

  writeFileSync(filename, content);
  return filename;
};
