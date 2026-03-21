import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
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

/**
 * Spawns a detached background process to fetch the latest version from npm
 * and write it to the cache file. The parent does not wait for this to finish.
 */
const spawnBackgroundCheck = (): void => {
  try {
    const cachePath = getCacheFilePath();
    // Inline script: fetch version, write JSON cache
    const script = `
      try {
        const { execSync } = require('child_process');
        const v = execSync('npm view bitcompass version', {
          encoding: 'utf-8',
          timeout: 5000,
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        if (v) {
          require('fs').writeFileSync(
            ${JSON.stringify(cachePath)},
            JSON.stringify({ lastCheck: Date.now(), latestVersion: v }),
            { mode: 0o600 }
          );
        }
      } catch {}
    `;
    const child = spawn(process.execPath, ['-e', script], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // Silently ignore spawn errors
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
 * Renders a bordered update notification box matching the BitCompass CLI aesthetic.
 * Uses the brand cyan (#00d4ff) for the border and accent colors.
 */
function renderUpdateBox(currentVersion: string, latestVersion: string): string {
  const cyan = chalk.rgb(0, 212, 255);
  const magenta = chalk.rgb(255, 64, 200);
  const dim = chalk.dim;

  const line1 = `Update available  ${dim(currentVersion)}  ${cyan('→')}  ${magenta.bold(latestVersion)}`;
  const line2 = `Run ${chalk.bold('"bitcompass self-update"')} to update`;

  // Strip ANSI for width calculation
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
  const w1 = strip(line1).length;
  const w2 = strip(line2).length;
  const innerWidth = Math.max(w1, w2) + 4; // 2 padding each side

  const pad1 = innerWidth - w1;
  const padL1 = Math.floor(pad1 / 2);
  const padR1 = pad1 - padL1;

  const pad2 = innerWidth - w2;
  const padL2 = Math.floor(pad2 / 2);
  const padR2 = pad2 - padL2;

  const top = cyan('╭' + '─'.repeat(innerWidth) + '╮');
  const bot = cyan('╰' + '─'.repeat(innerWidth) + '╯');
  const empty = cyan('│') + ' '.repeat(innerWidth) + cyan('│');
  const row1 = cyan('│') + ' '.repeat(padL1) + line1 + ' '.repeat(padR1) + cyan('│');
  const row2 = cyan('│') + ' '.repeat(padL2) + line2 + ' '.repeat(padR2) + cyan('│');

  return '\n' + top + '\n' + empty + '\n' + row1 + '\n' + row2 + '\n' + empty + '\n' + bot + '\n';
}

/**
 * Checks for CLI updates (cached, non-blocking).
 * Reads the cache to display a notification immediately if an update is available.
 * If the cache is stale, spawns a background process to refresh it (result shows next run).
 * Call this early in program execution for any command.
 */
export const checkForCliUpdate = (currentVersion: string): void => {
  try {
    const cache = readCache();
    const now = Date.now();
    const isStale = !cache || now - cache.lastCheck >= CHECK_INTERVAL_MS;

    if (isStale) {
      spawnBackgroundCheck();
    }

    if (cache?.latestVersion && compareVersion(cache.latestVersion, currentVersion) > 0) {
      process.stderr.write(renderUpdateBox(currentVersion, cache.latestVersion));
    }
  } catch {
    // Never let update check break the CLI
  }
};
