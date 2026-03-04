import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import { scanInstalled } from '../lib/installed-scan.js';
import { getGroupedUpdatable, flattenUpdatable, type UpdatableItem } from '../lib/update-check.js';
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

function printGroupedTable(items: UpdatableItem[]): void {
  if (items.length === 0) return;
  const kind = items[0].kind;
  const label = kind.charAt(0).toUpperCase() + kind.slice(1) + 's';
  console.log(chalk.bold(label));
  const titleWidth = Math.min(50, Math.max(20, ...items.map((i) => i.title.length)));
  console.log(
    '  ' +
      chalk.dim('Title'.padEnd(titleWidth)) +
      '  ' +
      chalk.dim('Current') +
      '  →  ' +
      chalk.dim('Available')
  );
  console.log('  ' + '-'.repeat(titleWidth + 20));
  for (const u of items) {
    const title = u.title.length > titleWidth ? u.title.slice(0, titleWidth - 1) + '…' : u.title.padEnd(titleWidth);
    console.log(
      '  ' +
        chalk.cyan(title) +
        '  ' +
        formatVersion(u.currentVersion).padEnd(10) +
        '  →  ' +
        formatVersion(u.availableVersion)
    );
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
  const grouped = await getGroupedUpdatable(installed, { kind: options.kind });
  spinner.stop();

  const allUpdatable = flattenUpdatable(grouped);
  if (allUpdatable.length === 0) {
    console.log(chalk.green('No updates available.'));
    return;
  }

  if (options.check) {
    console.log(chalk.cyan('Available updates:\n'));
    if (grouped.rules.length) printGroupedTable(grouped.rules);
    if (grouped.skills.length) printGroupedTable(grouped.skills);
    if (grouped.commands.length) printGroupedTable(grouped.commands);
    if (grouped.solutions.length) printGroupedTable(grouped.solutions);
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
