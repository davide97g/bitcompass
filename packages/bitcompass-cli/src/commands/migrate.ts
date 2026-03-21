import chalk from 'chalk';
import { getConfigDir } from '../auth/config.js';
import { loadProjectConfig } from '../auth/project-config.js';
import { runMigrations } from '../lib/migration-runner.js';
import { migrations } from '../migrations/registry.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const runMigrate = async (opts?: { dryRun?: boolean }): Promise<void> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(__dirname, '..', '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
  const currentVersion = pkg.version ?? '0.0.0';

  const config = loadProjectConfig();
  const projectConfigVersion = config?.configVersion !== undefined
    ? (typeof config.configVersion === 'number' ? '0.0.0' : config.configVersion)
    : undefined;

  const result = await runMigrations({
    currentVersion,
    migrations,
    globalStateDir: getConfigDir(),
    projectConfigVersion,
    dryRun: opts?.dryRun,
  });

  if (!result.success) {
    console.error(chalk.red(`\nMigration failed at v${result.failedVersion}: ${result.error}`));
    console.error(chalk.yellow('Fix the issue and run "bitcompass migrate" again to retry.'));
    process.exit(1);
  }

  if (result.migrationsRun === 0) {
    console.log(chalk.green('Already up to date.'));
  } else {
    if (opts?.dryRun) {
      console.log(chalk.dim('\nDry run complete. Run "bitcompass migrate" to apply changes.'));
    } else {
      console.log(chalk.green('\nMigration complete.'));
    }
  }
};
