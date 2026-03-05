import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import { scanInstalled } from '../lib/installed-scan.js';
import {
  getGroupedUpdatable,
  flattenUpdatable,
  type UpdatableItem,
} from '../lib/update-check.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { createSpinner } from '../lib/spinner.js';

export interface UpdateOptions {
  check?: boolean;
  all?: boolean;
  yes?: boolean;
  global?: boolean;
  kind?: 'rule' | 'skill' | 'command' | 'solution';
}

function formatVersion(v: string | null): string {
  return v != null && v !== '' ? v : '(none)';
}

/** Single table: kind (rule/skill/command/solution), name, version as-is, version to-be. */
function printUpdatesTable(items: UpdatableItem[]): void {
  if (items.length === 0) return;
  const kindWidth = 8;
  const titleWidth = Math.min(40, Math.max(16, ...items.map((i) => i.title.length)));
  const vWidth = 12;
  console.log(
    '  ' +
      chalk.dim('Kind'.padEnd(kindWidth)) +
      '  ' +
      chalk.dim('Name'.padEnd(titleWidth)) +
      '  ' +
      chalk.dim('As is'.padEnd(vWidth)) +
      '  ' +
      chalk.dim('To be')
  );
  console.log('  ' + '-'.repeat(kindWidth + titleWidth + vWidth + 16));
  for (const u of items) {
    const kind = u.kind.padEnd(kindWidth);
    const title =
      u.title.length > titleWidth
        ? u.title.slice(0, titleWidth - 1) + '…'
        : u.title.padEnd(titleWidth);
    const asIs = formatVersion(u.currentVersion).padEnd(vWidth);
    const toBe = formatVersion(u.availableVersion);
    console.log('  ' + chalk.dim(kind) + '  ' + chalk.cyan(title) + '  ' + asIs + '  ' + toBe);
  }
  console.log('');
}

export const runUpdate = async (options: UpdateOptions): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }

  if (!options.global) {
    getProjectConfig({ warnIfMissing: true });
  }

  const spinner = createSpinner('Checking for updates…');
  const installed = scanInstalled({ global: options.global });
  const { grouped, upToDateCount, totalCount } = await getGroupedUpdatable(installed, {
    kind: options.kind,
  });
  spinner.stop();

  const toUpdateCount = flattenUpdatable(grouped).length;
  if (totalCount === 0) {
    console.log(chalk.dim('No BitCompass items in folder.'));
    return;
  }
  const recap =
    toUpdateCount === 0
      ? chalk.green(`All ${totalCount} up to date.`)
      : chalk.cyan(
          `${upToDateCount} up to date, ${toUpdateCount} to be updated.`
        );
  console.log(recap);

  if (toUpdateCount === 0) return;

  const allUpdatable = flattenUpdatable(grouped);
  if (options.check) {
    console.log(chalk.cyan('Available updates (version as is → to be):\n'));
    printUpdatesTable(allUpdatable);
    return;
  }

  let toUpdate: UpdatableItem[];
  if (options.all) {
    toUpdate = allUpdatable;
  } else if (process.stdout.isTTY) {
    const choices = allUpdatable.map((u) => ({
      name: `[${u.kind}] ${u.title} (${formatVersion(u.currentVersion)} → ${formatVersion(u.availableVersion)})`,
      value: u.id,
      short: u.title,
    }));
    const { ids } = await inquirer.prompt<{ ids: string[] }>([
      {
        name: 'ids',
        message: 'Select items to update',
        type: 'checkbox',
        choices,
      },
    ]);
    if (ids.length === 0) {
      console.log(chalk.dim('Nothing selected.'));
      return;
    }
    toUpdate = allUpdatable.filter((u) => ids.includes(u.id));
  } else {
    console.error(chalk.red('Non-interactive mode: use --all -y to update all.'));
    process.exit(1);
  }

  if (!options.yes && process.stdout.isTTY) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        name: 'confirm',
        message: `Update ${toUpdate.length} item(s)?`,
        type: 'confirm',
        default: false,
      },
    ]);
    if (!confirm) {
      console.log(chalk.dim('Cancelled.'));
      return;
    }
  }

  const applySpinner = createSpinner(`Updating ${toUpdate.length} item(s)…`);
  const counts = { rules: 0, skills: 0, commands: 0, solutions: 0 };
  try {
    for (const u of toUpdate) {
      await pullRuleToFile(u.id, { global: options.global, useSymlink: true });
      counts[u.kind === 'rule' ? 'rules' : u.kind === 'skill' ? 'skills' : u.kind === 'command' ? 'commands' : 'solutions']++;
    }
    applySpinner.succeed(chalk.green('Update complete'));
  } catch (err) {
    applySpinner.fail(chalk.red('Update failed'));
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(message));
    process.exit(1);
  }

  const parts: string[] = [];
  if (counts.rules) parts.push(`${counts.rules} rule(s)`);
  if (counts.skills) parts.push(`${counts.skills} skill(s)`);
  if (counts.commands) parts.push(`${counts.commands} command(s)`);
  if (counts.solutions) parts.push(`${counts.solutions} solution(s)`);
  if (parts.length) {
    console.log(chalk.dim('Updated: ' + parts.join(', ') + '.'));
  }
}
