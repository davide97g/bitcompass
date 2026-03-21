import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { compareVersion } from './semver.js';
import { createSpinner } from './spinner.js';
import type { Migration } from '../migrations/types.js';

const STATE_FILE = 'migration-state.json';

interface MigrationState {
  lastMigratedVersion: string;
}

export interface RunMigrationsOpts {
  currentVersion: string;
  migrations: Migration[];
  globalStateDir: string;
  projectConfigVersion?: string;
  existingConfigDir?: boolean;
  dryRun?: boolean;
}

export interface RunMigrationsResult {
  success: boolean;
  failedVersion?: string;
  error?: string;
  migrationsRun: number;
}

function readGlobalState(dir: string): MigrationState | null {
  const path = join(dir, STATE_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as MigrationState;
  } catch {
    return null;
  }
}

function writeGlobalState(dir: string, state: MigrationState): void {
  try {
    writeFileSync(join(dir, STATE_FILE), JSON.stringify(state), { mode: 0o600 });
  } catch {
    // Silently ignore write errors
  }
}

function isExistingConfigDir(dir: string): boolean {
  if (!existsSync(dir)) return false;
  try {
    const entries = readdirSync(dir);
    return entries.some((e) => e !== STATE_FILE);
  } catch {
    return false;
  }
}

export async function runMigrations(opts: RunMigrationsOpts): Promise<RunMigrationsResult> {
  const { currentVersion, migrations, globalStateDir, dryRun } = opts;
  let migrationsRun = 0;

  let globalState = readGlobalState(globalStateDir);

  if (!globalState) {
    const hasExistingDir = opts.existingConfigDir ?? isExistingConfigDir(globalStateDir);
    if (!hasExistingDir) {
      writeGlobalState(globalStateDir, { lastMigratedVersion: currentVersion });
      return { success: true, migrationsRun: 0 };
    }
    globalState = { lastMigratedVersion: '0.0.0' };
  }

  const projectConfigVersion = opts.projectConfigVersion;

  for (const migration of migrations) {
    let lastVersion: string;
    if (migration.scope === 'global') {
      lastVersion = globalState.lastMigratedVersion;
    } else if (migration.scope === 'project') {
      if (projectConfigVersion === undefined) {
        continue;
      }
      lastVersion = projectConfigVersion;
    } else {
      continue;
    }

    if (compareVersion(migration.version, lastVersion) <= 0) {
      continue;
    }

    const spinner = dryRun ? null : createSpinner(migration.description);
    try {
      await migration.migrate({ dryRun });
      spinner?.succeed(chalk.green(migration.description));
      migrationsRun++;

      if (!dryRun) {
        if (migration.scope === 'global') {
          globalState.lastMigratedVersion = migration.version;
          writeGlobalState(globalStateDir, globalState);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      spinner?.fail(chalk.red(`${migration.description}: ${message}`));
      return {
        success: false,
        failedVersion: migration.version,
        error: message,
        migrationsRun,
      };
    }
  }

  if (!dryRun && compareVersion(currentVersion, globalState.lastMigratedVersion) > 0) {
    globalState.lastMigratedVersion = currentVersion;
    writeGlobalState(globalStateDir, globalState);
  }

  return { success: true, migrationsRun };
}
