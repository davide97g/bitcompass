import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export type TimeFrame = 'day' | 'week' | 'month';

export interface RepoSummary {
  remote_url: string;
  branch: string;
  repo_path: string;
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
 * Get a short summary of the repo: remote URL, current branch, path.
 */
export const getRepoSummary = (repoRoot: string): RepoSummary => {
  const remoteUrl = exec('git remote get-url origin', repoRoot) || '';
  const branch = exec('git rev-parse --abbrev-ref HEAD', repoRoot) || 'HEAD';
  return {
    remote_url: remoteUrl,
    branch,
    repo_path: repoRoot,
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
 * Run git log for the given period and return structured analysis.
 */
export const getGitAnalysis = (repoRoot: string, since: string): GitAnalysisResult => {
  const format = '%H%x00%s%x00%ci';
  const logOut = exec(`git log --since="${since}" --format=${format}`, repoRoot);
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

  const shortstatOut = exec(`git log --since="${since}" --shortstat --format=`, repoRoot);
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
