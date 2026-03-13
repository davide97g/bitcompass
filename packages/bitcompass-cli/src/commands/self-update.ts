import { execSync } from 'child_process';
import chalk from 'chalk';
import { createSpinner } from '../lib/spinner.js';

export const runSelfUpdate = async (): Promise<void> => {
  const spinner = createSpinner('Updating BitCompass CLI…');

  try {
    // Fetch latest version from npm
    const latestVersion = execSync('npm view bitcompass version', {
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
};
