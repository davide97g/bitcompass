import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadCredentials } from '../auth/config.js';
import { getProjectConfig } from '../auth/project-config.js';
import { searchRules, fetchRules, getRuleById, insertRule } from '../api/client.js';
import type { RuleInsert } from '../types.js';

export const runSolutionsSearch = async (query?: string): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  const q = query ?? (await inquirer.prompt<{ q: string }>([{ name: 'q', message: 'Search query', type: 'input' }])).q;
  const spinner = ora('Searching solutions…').start();
  const list = await searchRules(q, { kind: 'solution', limit: 20 });
  spinner.stop();
  if (list.length === 0) {
    console.log(chalk.yellow('No solutions found.'));
    return;
  }
  const choice = await inquirer.prompt<{ id: string }>([
    {
      name: 'id',
      message: 'Select a solution',
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

export const runSolutionsPull = async (id?: string): Promise<void> => {
  if (!loadCredentials()) {
    console.error(chalk.red('Not logged in. Run bitcompass login.'));
    process.exit(1);
  }
  let targetId = id;
  if (!targetId) {
    const spinner = ora('Loading solutions…').start();
    const list = await fetchRules('solution');
    spinner.stop();
    if (list.length === 0) {
      console.log(chalk.yellow('No solutions to pull.'));
      return;
    }
    const choice = await inquirer.prompt<{ id: string }>([
      { name: 'id', message: 'Select solution', type: 'list', choices: list.map((r) => ({ name: r.title, value: r.id })) },
    ]);
    targetId = choice.id;
  }
  const rule = await getRuleById(targetId!);
  if (!rule) {
    console.error(chalk.red('Solution not found.'));
    process.exit(1);
  }
  const { outputPath } = getProjectConfig({ warnIfMissing: true });
  const outDir = join(process.cwd(), outputPath);
  mkdirSync(outDir, { recursive: true });
  const filename = join(outDir, `solution-${rule.id}.md`);
  const content = `# ${rule.title}\n\n${rule.description}\n\n## Solution\n\n${rule.body}\n`;
  writeFileSync(filename, content);
  console.log(chalk.green('Wrote'), filename);
};

export const runSolutionsPush = async (file?: string): Promise<void> => {
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
      payload.kind = 'solution';
    } catch {
      const lines = raw.split('\n');
      const title = lines[0].replace(/^#\s*/, '') || 'Untitled';
      payload = { kind: 'solution', title, description: '', body: raw };
    }
  } else {
    const answers = await inquirer.prompt<{ title: string; description: string; body: string }>([
      { name: 'title', message: 'Problem title', type: 'input', default: 'Untitled' },
      { name: 'description', message: 'Description', type: 'input', default: '' },
      { name: 'body', message: 'Solution content', type: 'editor', default: '' },
    ]);
    payload = { kind: 'solution', title: answers.title, description: answers.description, body: answers.body };
  }
  const spinner = ora('Publishing solution…').start();
  const created = await insertRule(payload);
  spinner.succeed(chalk.green('Published solution ') + created.id);
  console.log(chalk.dim(created.title));
}
