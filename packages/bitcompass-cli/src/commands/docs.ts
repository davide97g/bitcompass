import inquirer from 'inquirer';
import { createSpinner } from '../lib/spinner.js';
import chalk from 'chalk';
import { loadCredentials } from '../auth/config.js';
import { searchRules, fetchRules, getRuleById } from '../api/client.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { formatList, shouldUseTable } from '../lib/list-format.js';
import { runSharePush } from './share.js';

export const runDocsSearch = async (
  query?: string,
  options?: { listOnly?: boolean }
): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const q = query ?? (await inquirer.prompt<{ q: string }>([{ name: 'q', message: 'Search query', type: 'input' }])).q;
  const spinner = createSpinner('Searching docs…');
  const list = await searchRules(q, { kind: 'documentation', limit: 20 });
  spinner.stop();
  if (list.length === 0) {
    console.log(chalk.yellow('No docs found.'));
    return;
  }
  if (options?.listOnly) {
    formatList(
      list.map((r) => ({ id: r.id, title: r.title, kind: r.kind })),
      { useTable: shouldUseTable(), showKind: true }
    );
    return;
  }
  const choice = await inquirer.prompt<{ id: string }>([
    {
      name: 'id',
      message: 'Select a doc',
      type: 'list',
      choices: list.map((r) => ({ name: `${r.title} (${r.id})`, value: r.id })),
    },
  ]);
  const rule = await getRuleById(choice.id);
  if (rule) {
    console.log(chalk.cyan(rule.title));
    console.log(rule.body);
  }
};

export const runDocsList = async (options?: { table?: boolean }): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const spinner = createSpinner('Loading docs…');
  const list = await fetchRules('documentation');
  spinner.stop();
  if (list.length === 0) {
    console.log(chalk.yellow('No docs yet.'));
    return;
  }
  const useTable = shouldUseTable(options?.table);
  formatList(
    list.map((r) => ({ id: r.id, title: r.title, kind: r.kind })),
    { useTable, showKind: false }
  );
};

export const runDocsPull = async (id?: string, options?: { global?: boolean; copy?: boolean }): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  let targetId = id;
  if (!targetId) {
    const spinner = createSpinner('Loading docs…');
    const list = await fetchRules('documentation');
    spinner.stop();
    if (list.length === 0) {
      console.log(chalk.yellow('No docs to pull.'));
      return;
    }
    const choice = await inquirer.prompt<{ id: string }>([
      { name: 'id', message: 'Select doc', type: 'list', choices: list.map((r) => ({ name: r.title, value: r.id })) },
    ]);
    targetId = choice.id;
  }

  const spinner = createSpinner('Pulling doc…');
  try {
    const filename = await pullRuleToFile(targetId, {
      global: options?.global,
      useSymlink: !options?.copy, // Use symlink unless --copy flag is set
    });
    spinner.succeed(chalk.green('Pulled doc'));
    console.log(chalk.dim(filename));
    if (options?.copy) {
      console.log(chalk.dim('Copied as file (not a symlink)'));
    } else {
      console.log(chalk.dim('Created symbolic link to cached doc'));
    }
    if (options?.global) {
      console.log(chalk.dim('Installed globally for all projects'));
    }
  } catch (error: unknown) {
    spinner.fail(chalk.red('Failed to pull doc'));
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(message));
    process.exit(message.includes('not found') ? 2 : 1);
  }
};

export const runDocsPush = async (
  file?: string,
  options?: { projectId?: string }
): Promise<void> => {
  await runSharePush(file, { kind: 'documentation', projectId: options?.projectId });
};
