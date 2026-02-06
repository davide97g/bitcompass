import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { loadCredentials } from '../auth/config.js';
import { searchRules, fetchRules, getRuleById, insertRule } from '../api/client.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import { formatList, shouldUseTable } from '../lib/list-format.js';
import type { RuleInsert } from '../types.js';

export const runCommandsSearch = async (query?: string): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const q = query ?? (await inquirer.prompt<{ q: string }>([{ name: 'q', message: 'Search query', type: 'input' }])).q;
  const spinner = ora('Searching commands…').start();
  const list = await searchRules(q, { kind: 'command', limit: 20 });
  spinner.stop();
  if (list.length === 0) {
    console.log(chalk.yellow('No commands found.'));
    return;
  }
  const choice = await inquirer.prompt<{ id: string }>([
    {
      name: 'id',
      message: 'Select a command',
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

export const runCommandsList = async (options?: { table?: boolean }): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const spinner = ora('Loading commands…').start();
  const list = await fetchRules('command');
  spinner.stop();
  if (list.length === 0) {
    console.log(chalk.yellow('No commands yet.'));
    return;
  }
  const useTable = shouldUseTable(options?.table);
  formatList(
    list.map((r) => ({ id: r.id, title: r.title, kind: r.kind })),
    { useTable, showKind: false }
  );
};

export const runCommandsPull = async (id?: string, options?: { global?: boolean; copy?: boolean }): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  let targetId = id;
  if (!targetId) {
    const spinner = ora('Loading commands…').start();
    const list = await fetchRules('command');
    spinner.stop();
    if (list.length === 0) {
      console.log(chalk.yellow('No commands to pull.'));
      return;
    }
    const choice = await inquirer.prompt<{ id: string }>([
      { name: 'id', message: 'Select command', type: 'list', choices: list.map((r) => ({ name: r.title, value: r.id })) },
    ]);
    targetId = choice.id;
  }
  
  const spinner = ora('Pulling command…').start();
  try {
    const filename = await pullRuleToFile(targetId, {
      global: options?.global,
      useSymlink: !options?.copy, // Use symlink unless --copy flag is set
    });
    spinner.succeed(chalk.green('Pulled command'));
    console.log(chalk.dim(filename));
    if (options?.copy) {
      console.log(chalk.dim('Copied as file (not a symlink)'));
    } else {
      console.log(chalk.dim('Created symbolic link to cached command'));
    }
    if (options?.global) {
      console.log(chalk.dim('Installed globally for all projects'));
    }
  } catch (error: unknown) {
    spinner.fail(chalk.red('Failed to pull command'));
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(message));
    process.exit(message.includes('not found') ? 2 : 1);
  }
};

export const runCommandsPush = async (file?: string): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  let payload: RuleInsert;
  if (file) {
    const { readFileSync } = await import('fs');
    const raw = readFileSync(file, 'utf-8');
    try {
      payload = JSON.parse(raw) as RuleInsert;
      payload.kind = 'command';
    } catch {
      const lines = raw.split('\n');
      const title = lines[0].replace(/^#\s*/, '') || 'Untitled';
      payload = { kind: 'command', title, description: '', body: raw };
    }
  } else {
    const answers = await inquirer.prompt<{ title: string; description: string; body: string }>([
      { name: 'title', message: 'Command title', type: 'input', default: 'Untitled' },
      { name: 'description', message: 'Description', type: 'input', default: '' },
      { name: 'body', message: 'Command content', type: 'editor', default: '' },
    ]);
    payload = { kind: 'command', title: answers.title, description: answers.description, body: answers.body };
  }
  const spinner = ora('Publishing command…').start();
  const created = await insertRule(payload);
  spinner.succeed(chalk.green('Published command ') + created.id);
  console.log(chalk.dim(created.title));
}
