import { execSync } from 'child_process';
import chalk from 'chalk';
import { createSpinner } from '../lib/spinner.js';
import { runMigrations } from '../lib/migration-runner.js';
import { migrations } from '../migrations/registry.js';
import { getConfigDir } from '../auth/config.js';
import { loadProjectConfig } from '../auth/project-config.js';

export const runSelfUpdate = async (): Promise<void> => {
  const spinner = createSpinner('Updating BitCompass CLI…');

  let latestVersion: string;
  try {
    latestVersion = execSync('npm view bitcompass version', {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    spinner.text = `Installing bitcompass@${latestVersion}…`;

    execSync('npm install -g bitcompass@latest', {
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    spinner.succeed(chalk.green(`Updated to BitCompass ${latestVersion}`));
  } catch (err) {
    spinner.fail(chalk.red('Update failed'));
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('EACCES') || message.includes('permission')) {
      console.error(
        chalk.yellow('  Permission denied. Try running with sudo:') +
        '\n' +
        chalk.cyan('  sudo npm install -g bitcompass@latest')
      );
    } else {
      console.error(chalk.red(`  ${message}`));
    }
    process.exit(1);
  }

  // Run migrations after successful install
  try {
    const config = loadProjectConfig();
    const projectConfigVersion = config?.configVersion !== undefined
      ? (typeof config.configVersion === 'number' ? '0.0.0' : config.configVersion)
      : undefined;

    console.log(''); // blank line before migration output
    const result = await runMigrations({
      currentVersion: latestVersion,
      migrations,
      globalStateDir: getConfigDir(),
      projectConfigVersion,
    });

    if (!result.success) {
      console.error(chalk.yellow(`\nMigration for v${result.failedVersion} failed: ${result.error}`));
      console.error(chalk.yellow('Run "bitcompass migrate" to retry.'));
    }
  } catch {
    // Migration failure should never prevent self-update from completing
    console.error(chalk.yellow('\nMigration check failed. Run "bitcompass migrate" manually.'));
  }
};
