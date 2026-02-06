import { execSync } from 'child_process';
import { existsSync } from 'fs';

export type TimeFrame = 'day' | 'week' | 'month';

export interface RepoSummary {
  remote_url: string;
  branch: string;
  repo_path?: string; // Deprecated: no longer saved, kept for backward compatibility
}

export interface GitCommitInfo {
  hash: string;
  subject: string;
  date: string;
}

export interface GitAnalysisResult {
  commit_count: number;
  commits: GitCommitInfo[];
  files_changed: { insertions: number; deletions: number };
}

export interface PeriodBounds {
  period_start: string;
  period_end: string;
  since: string;
}

const exec = (cmd: string, cwd: string): string => {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
};

/**
 * Resolve the git repository root from the given directory.
 * Returns null if not inside a git work tree.
 */
export const getRepoRoot = (cwd: string): string | null => {
  try {
    const root = exec('git rev-parse --show-toplevel', cwd);
    if (!root || !existsSync(root)) return null;
    return root;
  } catch {
    return null;
  }
};

/**
 * Get a short summary of the repo: remote URL, current branch.
 * Note: repo_path is no longer included to avoid storing absolute paths.
 */
export const getRepoSummary = (repoRoot: string): RepoSummary => {
  const remoteUrl = exec('git remote get-url origin', repoRoot) || '';
  const branch = exec('git rev-parse --abbrev-ref HEAD', repoRoot) || 'HEAD';
  return {
    remote_url: remoteUrl,
    branch,
  };
};

/**
 * Compute period_start, period_end, and a git --since string for the given time frame.
 * period_end is now; period_start and since are the start of the window.
 */
export const getPeriodForTimeFrame = (timeFrame: TimeFrame): PeriodBounds => {
  const now = new Date();
  const period_end = now.toISOString();
  let period_start: Date;

  switch (timeFrame) {
    case 'day': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      period_start = start;
      break;
    }
    case 'week': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      period_start = start;
      break;
    }
    case 'month': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      period_start = start;
      break;
    }
    default:
      period_start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const since = period_start.toISOString();
  return {
    period_start: period_start.toISOString(),
    period_end,
    since,
  };
};

/**
 * Parse an ISO date string (YYYY-MM-DD) to Date at start of day (UTC).
 */
const parseDate = (s: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) - 1;
  const d = parseInt(match[3], 10);
  const date = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) return null;
  return date;
};

/**
 * Compute period for custom date(s). Single date = that day; two dates = range (inclusive).
 * period_end is end of last day (23:59:59.999).
 */
export const getPeriodForCustomDates = (
  startDateStr: string,
  endDateStr?: string
): PeriodBounds => {
  const startDate = parseDate(startDateStr);
  if (!startDate) {
    throw new Error(`Invalid start date: ${startDateStr}. Use YYYY-MM-DD.`);
  }
  let periodEnd: Date;
  if (endDateStr !== undefined && endDateStr.trim() !== '') {
    const endDate = parseDate(endDateStr);
    if (!endDate) throw new Error(`Invalid end date: ${endDateStr}. Use YYYY-MM-DD.`);
    if (endDate < startDate) throw new Error('End date must be on or after start date.');
    periodEnd = new Date(endDate);
    periodEnd.setUTCHours(23, 59, 59, 999);
  } else {
    periodEnd = new Date(startDate);
    periodEnd.setUTCHours(23, 59, 59, 999);
  }
  const period_start = new Date(startDate);
  period_start.setUTCHours(0, 0, 0, 0);
  const since = period_start.toISOString();
  return {
    period_start: period_start.toISOString(),
    period_end: periodEnd.toISOString(),
    since,
  };
};

/**
 * Run git log for the given period and return structured analysis.
 * If until is provided, commits are limited to the range [since, until].
 */
export const getGitAnalysis = (
  repoRoot: string,
  since: string,
  until?: string
): GitAnalysisResult => {
  const format = '%H%x00%s%x00%ci';
  const untilArg = until ? ` --until="${until}"` : '';
  const logOut = exec(`git log --since="${since}"${untilArg} --format=${format}`, repoRoot);
  const commits: GitCommitInfo[] = [];
  if (logOut) {
    for (const line of logOut.split('\n')) {
      const parts = line.split('\0');
      if (parts.length >= 3) {
        commits.push({
          hash: parts[0].slice(0, 7),
          subject: parts[1] || '',
          date: parts[2] || '',
        });
      }
    }
  }

  const shortstatOut = exec(
    `git log --since="${since}"${untilArg} --shortstat --format=`,
    repoRoot
  );
  let insertions = 0;
  let deletions = 0;
  if (shortstatOut) {
    for (const m of shortstatOut.matchAll(/(\d+) insertion[s]?/g)) {
      insertions += parseInt(m[1], 10) || 0;
    }
    for (const m of shortstatOut.matchAll(/(\d+) deletion[s]?/g)) {
      deletions += parseInt(m[1], 10) || 0;
    }
  }

  return {
    commit_count: commits.length,
    commits,
    files_changed: { insertions, deletions },
  };
};
