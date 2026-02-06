import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { loadCredentials } from '../auth/config.js';
import { searchRules, fetchRules, getRuleById, insertRule } from '../api/client.js';
import { pullRuleToFile } from '../lib/rule-file-ops.js';
import type { RuleInsert } from '../types.js';

export const runSkillsSearch = async (query?: string): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const q = query ?? (await inquirer.prompt<{ q: string }>([{ name: 'q', message: 'Search query', type: 'input' }])).q;
  const spinner = ora('Searching skills…').start();
  const list = await searchRules(q, { kind: 'skill', limit: 20 });
  spinner.stop();
  if (list.length === 0) {
    console.log(chalk.yellow('No skills found.'));
    return;
  }
  const choice = await inquirer.prompt<{ id: string }>([
    {
      name: 'id',
      message: 'Select a skill',
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

export const runSkillsList = async (): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const spinner = ora('Loading skills…').start();
  const list = await fetchRules('skill');
  spinner.stop();
  list.forEach((r) => console.log(`${chalk.cyan(r.title)}  ${chalk.dim(r.id)}`));
  if (list.length === 0) console.log(chalk.yellow('No skills yet.'));
};

export const runSkillsPull = async (id?: string, options?: { global?: boolean; copy?: boolean }): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  let targetId = id;
  if (!targetId) {
    const spinner = ora('Loading skills…').start();
    const list = await fetchRules('skill');
    spinner.stop();
    if (list.length === 0) {
      console.log(chalk.yellow('No skills to pull.'));
      return;
    }
    const choice = await inquirer.prompt<{ id: string }>([
      { name: 'id', message: 'Select skill', type: 'list', choices: list.map((r) => ({ name: r.title, value: r.id })) },
    ]);
    targetId = choice.id;
  }
  
  const spinner = ora('Pulling skill…').start();
  try {
    const filename = await pullRuleToFile(targetId, {
      global: options?.global,
      useSymlink: !options?.copy, // Use symlink unless --copy flag is set
    });
    spinner.succeed(chalk.green('Pulled skill'));
    console.log(chalk.dim(filename));
    if (options?.copy) {
      console.log(chalk.dim('Copied as file (not a symlink)'));
    } else {
      console.log(chalk.dim('Created symbolic link to cached skill'));
    }
    if (options?.global) {
      console.log(chalk.dim('Installed globally for all projects'));
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to pull skill'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
};

export const runSkillsPush = async (file?: string): Promise<void> => {
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
      payload.kind = 'skill';
    } catch {
      const lines = raw.split('\n');
      const title = lines[0].replace(/^#\s*/, '') || 'Untitled';
      payload = { kind: 'skill', title, description: '', body: raw };
    }
  } else {
    const answers = await inquirer.prompt<{ title: string; description: string; body: string }>([
      { name: 'title', message: 'Skill title', type: 'input', default: 'Untitled' },
      { name: 'description', message: 'Description', type: 'input', default: '' },
      { name: 'body', message: 'Skill content', type: 'editor', default: '' },
    ]);
    payload = { kind: 'skill', title: answers.title, description: answers.description, body: answers.body };
  }
  const spinner = ora('Publishing skill…').start();
  const created = await insertRule(payload);
  spinner.succeed(chalk.green('Published skill ') + created.id);
  console.log(chalk.dim(created.title));
}
