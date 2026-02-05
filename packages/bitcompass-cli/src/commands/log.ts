import inquirer from 'inquirer';
import chalk from 'chalk';
import { insertActivityLog } from '../api/client.js';
import { loadCredentials } from '../auth/config.js';
import type { ActivityLogInsert } from '../types.js';
import type { TimeFrame } from '../lib/git-analysis.js';
import {
  getRepoRoot,
  getRepoSummary,
  getGitAnalysis,
  getPeriodForTimeFrame,
} from '../lib/git-analysis.js';

/**
 * Shared logic: resolve repo, compute period, gather summary + git analysis, insert log.
 * Used by both CLI and MCP. Returns the created log id or throws.
 */
export const buildAndPushActivityLog = async (
  timeFrame: TimeFrame,
  cwd: string
): Promise<{ id: string }> => {
  const repoRoot = getRepoRoot(cwd);
  if (!repoRoot) {
    throw new Error('Not a git repository. Run from a project with git or pass a valid repo path.');
  }
  const period = getPeriodForTimeFrame(timeFrame);
  const repo_summary = getRepoSummary(repoRoot);
  const git_analysis = getGitAnalysis(repoRoot, period.since);
  const payload: ActivityLogInsert = {
    time_frame: timeFrame,
    period_start: period.period_start,
    period_end: period.period_end,
    repo_summary: repo_summary as unknown as Record<string, unknown>,
    git_analysis: git_analysis as unknown as Record<string, unknown>,
  };
  const created = await insertActivityLog(payload);
  return { id: created.id };
};

export const runLog = async (): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const cwd = process.cwd();
  const repoRoot = getRepoRoot(cwd);
  if (!repoRoot) {
    console.error(chalk.red('Not a git repository. Run this command from a project with git.'));
    process.exit(1);
  }
  const choice = await inquirer.prompt<{ time_frame: TimeFrame }>([
    {
      name: 'time_frame',
      message: 'Time frame',
      type: 'list',
      choices: [
        { name: 'Day', value: 'day' },
        { name: 'Week', value: 'week' },
        { name: 'Month', value: 'month' },
      ],
    },
  ]);
  const timeFrame = choice.time_frame;
  const result = await buildAndPushActivityLog(timeFrame, cwd);
  console.log(chalk.green('Log saved.'), chalk.dim(result.id));
};
