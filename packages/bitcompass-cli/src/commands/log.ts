import chalk from 'chalk';
import inquirer from 'inquirer';
import type { Ora } from 'ora';
import { createSpinner } from '../lib/spinner.js';
import { insertActivityLog } from '../api/client.js';
import { loadCredentials } from '../auth/config.js';
import type { TimeFrame } from '../lib/git-analysis.js';
import {
    getGitAnalysis,
    getPeriodForCustomDates,
    getPeriodForTimeFrame,
    getRepoRoot,
    getRepoSummary,
    parseDate,
} from '../lib/git-analysis.js';
import type { ActivityLogInsert } from '../types.js';

export type LogProgressStep = 'analyzing' | 'pushing';

type PeriodBounds = { period_start: string; period_end: string; since: string };

/** Core logic: gather summary + git analysis, insert log. Shared by both build functions. */
const buildAndPushCore = async (
  repoRoot: string,
  period: PeriodBounds,
  timeFrame: TimeFrame,
  onProgress?: (step: LogProgressStep) => void
): Promise<{ id: string }> => {
  onProgress?.('analyzing');
  const repo_summary = getRepoSummary(repoRoot);
  const git_analysis = getGitAnalysis(repoRoot, period.since, period.period_end);
  const payload: ActivityLogInsert = {
    time_frame: timeFrame,
    period_start: period.period_start,
    period_end: period.period_end,
    repo_summary: repo_summary as unknown as Record<string, unknown>,
    git_analysis: git_analysis as unknown as Record<string, unknown>,
  };
  onProgress?.('pushing');
  const created = await insertActivityLog(payload);
  return { id: created.id };
};

/**
 * Shared logic: resolve repo, compute period, gather summary + git analysis, insert log.
 * Used by both CLI and MCP. Returns the created log id or throws.
 * Optional onProgress callback for CLI to show step-wise spinner (e.g. analyzing → pushing).
 */
export const buildAndPushActivityLog = async (
  timeFrame: TimeFrame,
  cwd: string,
  onProgress?: (step: LogProgressStep) => void
): Promise<{ id: string }> => {
  const repoRoot = getRepoRoot(cwd);
  if (!repoRoot) {
    throw new Error('Not a git repository. Run from a project with git or pass a valid repo path.');
  }
  const period = getPeriodForTimeFrame(timeFrame);
  return buildAndPushCore(repoRoot, period, timeFrame, onProgress);
};

/**
 * Push an activity log for a custom date or date range. timeFrame is used for display (day/week/month).
 */
export const buildAndPushActivityLogWithPeriod = async (
  period: PeriodBounds,
  timeFrame: TimeFrame,
  cwd: string,
  onProgress?: (step: LogProgressStep) => void
): Promise<{ id: string }> => {
  const repoRoot = getRepoRoot(cwd);
  if (!repoRoot) {
    throw new Error('Not a git repository. Run from a project with git or pass a valid repo path.');
  }
  return buildAndPushCore(repoRoot, period, timeFrame, onProgress);
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDateArg = (s: string): boolean => ISO_DATE.test(s.trim());

/** Parse argv for log: [start] or [start, end] or [start, '-', end]. Returns { start, end } or null for interactive. */
export const parseLogArgs = (args: string[]): { start: string; end?: string } | null => {
  const trimmed = args.map((a) => a.trim()).filter(Boolean);
  if (trimmed.length === 0) return null;
  if (trimmed.length === 1 && isDateArg(trimmed[0])) return { start: trimmed[0] };
  if (trimmed.length === 2 && isDateArg(trimmed[0]) && isDateArg(trimmed[1])) {
    return { start: trimmed[0], end: trimmed[1] };
  }
  if (trimmed.length === 3 && isDateArg(trimmed[0]) && trimmed[1] === '-' && isDateArg(trimmed[2])) {
    return { start: trimmed[0], end: trimmed[2] };
  }
  throw new Error(
    'Usage: bitcompass log [YYYY-MM-DD] or bitcompass log [YYYY-MM-DD] [YYYY-MM-DD] or bitcompass log [YYYY-MM-DD] - [YYYY-MM-DD]'
  );
};

/** Thrown for invalid date args; CLI should exit with code 2. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Choose time_frame for a custom range by span (day ≤ 1, week ≤ 7, else month). */
const timeFrameForRange = (start: string, end: string): TimeFrame => {
  const a = new Date(start);
  const b = new Date(end);
  const days = Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days <= 1) return 'day';
  if (days <= 7) return 'week';
  return 'month';
};

const runLogWithParsedDates = async (
  parsed: { start: string; end?: string },
  cwd: string,
  spinner: Ora,
  onProgress: (step: LogProgressStep) => void
): Promise<void> => {
  if (!parseDate(parsed.start)) {
    spinner.stop();
    throw new ValidationError(`Invalid date "${parsed.start}". Use YYYY-MM-DD (e.g. 2025-02-06).`);
  }
  if (parsed.end !== undefined && !parseDate(parsed.end)) {
    spinner.stop();
    throw new ValidationError(`Invalid date "${parsed.end}". Use YYYY-MM-DD (e.g. 2025-02-06).`);
  }
  const period = getPeriodForCustomDates(parsed.start, parsed.end);
  const timeFrame = parsed.end ? timeFrameForRange(parsed.start, parsed.end) : 'day';
  try {
    const result = await buildAndPushActivityLogWithPeriod(period, timeFrame, cwd, onProgress);
    spinner.succeed(chalk.green('Log saved.'));
    console.log(chalk.dim(result.id));
  } catch (err) {
    spinner.fail(chalk.red(err instanceof Error ? err.message : 'Failed'));
    throw err;
  }
};

const runLogInteractive = async (
  cwd: string,
  onProgress: (step: LogProgressStep) => void
): Promise<void> => {
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
  const spinner = createSpinner('Analyzing repository…');
  try {
    const result = await buildAndPushActivityLog(choice.time_frame, cwd, onProgress);
    spinner.succeed(chalk.green('Log saved.'));
    console.log(chalk.dim(result.id));
  } catch (err) {
    spinner.fail(chalk.red(err instanceof Error ? err.message : 'Failed'));
    throw err;
  }
};

export const runLog = async (args: string[] = []): Promise<void> => {
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

  const parsed = parseLogArgs(args);
  const spinner = createSpinner('Analyzing repository…');
  const onProgress = (step: LogProgressStep) => {
    spinner.text = step === 'analyzing' ? 'Analyzing repository…' : 'Pushing activity log…';
  };

  if (parsed) {
    await runLogWithParsedDates(parsed, cwd, spinner, onProgress);
    return;
  }

  spinner.stop();
  await runLogInteractive(cwd, onProgress);
};
