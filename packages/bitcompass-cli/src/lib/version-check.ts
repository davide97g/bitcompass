import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { getConfigDir } from '../auth/config.js';

const CHECK_FILE = 'update-check.json';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface UpdateCheckCache {
  lastCheck: number;
  latestVersion: string;
}

const getCacheFilePath = (): string => {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, CHECK_FILE);
};

const readCache = (): UpdateCheckCache | null => {
  const path = getCacheFilePath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as UpdateCheckCache;
  } catch {
    return null;
  }
};

const writeCache = (cache: UpdateCheckCache): void => {
  try {
    writeFileSync(getCacheFilePath(), JSON.stringify(cache), { mode: 0o600 });
  } catch {
    // Silently ignore write errors
  }
};

const fetchLatestVersion = (): string | null => {
  try {
    const result = execSync('npm view bitcompass version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return result.trim();
  } catch {
    return null;
  }
};

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((s) => parseInt(s, 10));
  const pb = b.split('.').map((s) => parseInt(s, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

/**
 * Checks for CLI updates (cached, max once per hour).
 * If a newer version is available, prints a banner to stderr.
 * Call this early in program execution for any command.
 */
export const checkForCliUpdate = (currentVersion: string): void => {
  try {
    const cache = readCache();
    const now = Date.now();

    let latestVersion: string | null = null;

    if (cache && now - cache.lastCheck < CHECK_INTERVAL_MS) {
      latestVersion = cache.latestVersion;
    } else {
      latestVersion = fetchLatestVersion();
      if (latestVersion) {
        writeCache({ lastCheck: now, latestVersion });
      }
    }

    if (latestVersion && compareVersion(latestVersion, currentVersion) > 0) {
      const banner =
        '\n' +
        chalk.yellow(`  Update available: ${chalk.dim(currentVersion)} → ${chalk.green(latestVersion)}`) +
        '\n' +
        chalk.yellow(`  Run ${chalk.cyan('bitcompass self-update')} to install`) +
        '\n';
      process.stderr.write(banner);
    }
  } catch {
    // Never let update check break the CLI
  }
};
