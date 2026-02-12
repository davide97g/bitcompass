#!/usr/bin/env node

import 'dotenv/config';

import chalk from 'chalk';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { runConfigGet, runConfigList, runConfigSet } from './commands/config-cmd.js';
import { runInit } from './commands/init.js';
import { runLogin } from './commands/login.js';
import { runLogout } from './commands/logout.js';
import { runMcpStart, runMcpStatus } from './commands/mcp.js';
import { runLog, ValidationError } from './commands/log.js';
import { runRulesList, runRulesPull, runRulesPush, runRulesSearch } from './commands/rules.js';
import { runSolutionsList, runSolutionsPull, runSolutionsPush, runSolutionsSearch } from './commands/solutions.js';
import { runSkillsList, runSkillsPull, runSkillsPush, runSkillsSearch } from './commands/skills.js';
import { runCommandsList, runCommandsPull, runCommandsPush, runCommandsSearch } from './commands/commands.js';
import { runGlossary } from './commands/glossary.js';
import { runWhoami } from './commands/whoami.js';

// Disable chalk colors when NO_COLOR is set or --no-color is passed (must run before any command)
if (process.env.NO_COLOR !== undefined || process.argv.includes('--no-color')) {
  chalk.level = 0;
}

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const program = new Command();

program
  .name('bitcompass')
  .description('BitCompass CLI - rules, solutions, and MCP server')
  .version(version, '-v, -V, --version', 'display version number')
  .option('--no-color', 'Disable colored output');

program
  .command('login')
  .description('Log in with Google (opens browser)')
  .action(() => runLogin().catch((err) => { console.error(chalk.red(err.message)); process.exit(1); }));

program
  .command('logout')
  .description('Remove stored credentials')
  .action(runLogout);

program
  .command('whoami')
  .description('Show current user (email)')
  .action(runWhoami);

program
  .command('glossary')
  .description('Show glossary (rules, solutions, skills, commands)')
  .action(runGlossary);

program
  .command('init')
  .description('Configure project: editor/AI provider and output folder for rules/docs/commands')
  .action(() => runInit().catch(handleErr));

program
  .command('log [dates...]')
  .description(
    'Collect repo summary and git activity, then push to your activity logs. Optional: bitcompass log YYYY-MM-DD or bitcompass log YYYY-MM-DD YYYY-MM-DD'
  )
  .addHelpText(
    'after',
    `
Examples:
  bitcompass log
  bitcompass log 2025-02-01
  bitcompass log 2025-02-01 2025-02-05
`
  )
  .action((dates: string[]) =>
    runLog(dates ?? []).catch((err) => {
      if (err instanceof ValidationError) {
        console.error(chalk.red(err.message));
        process.exit(2);
      }
      handleErr(err);
    })
  );

const configCmd = program.command('config').description('Show or set config');
configCmd.action(runConfigList);
configCmd.command('list').description('List config values').action(runConfigList);
configCmd.command('set <key> <value>').description('Set supabaseUrl, supabaseAnonKey, or apiUrl').action((key: string, value: string) => runConfigSet(key, value));
configCmd.command('get <key>').description('Get a config value').action((key: string) => runConfigGet(key));

// rules
const rules = program.command('rules').description('Manage rules');
rules
  .command('search [query]')
  .description('Search rules')
  .option('-l, --list', 'List results only; do not prompt to select')
  .action((query?: string, cmd?: { opts(): { list?: boolean } }) =>
    runRulesSearch(query, { listOnly: cmd?.opts()?.list }).catch(handleErr)
  );
rules
  .command('list')
  .description('List rules')
  .option('--table', 'Show output in aligned columns (default when TTY)')
  .addHelpText('after', '\nExamples:\n  bitcompass rules list\n  bitcompass rules list --table\n')
  .action((opts: { table?: boolean }) => runRulesList({ table: opts.table }).catch(handleErr));
rules
  .command('pull [id]')
  .description('Pull a rule by ID or choose from list (creates symbolic link by default)')
  .option('-g, --global', 'Install globally to ~/.cursor/rules/ for all projects')
  .option('--copy', 'Copy file instead of creating symbolic link')
  .addHelpText(
    'after',
    '\nExamples:\n  bitcompass rules pull <id>\n  bitcompass rules pull <id> --global\n  bitcompass rules pull <id> --copy\n'
  )
  .action((id?: string, options?: { global?: boolean; copy?: boolean }) => runRulesPull(id, options).catch(handleErr));
rules
  .command('push [file]')
  .description('Push a rule (file or interactive)')
  .option('--project-id <uuid>', 'Scope to Compass project (UUID)')
  .action((file?: string, opts?: { projectId?: string }) =>
    runRulesPush(file, { projectId: opts?.projectId }).catch(handleErr)
  );

// solutions
const solutions = program.command('solutions').description('Manage solutions');
solutions
  .command('search [query]')
  .description('Search solutions')
  .option('-l, --list', 'List results only; do not prompt to select')
  .action((query?: string, cmd?: { opts(): { list?: boolean } }) =>
    runSolutionsSearch(query, { listOnly: cmd?.opts()?.list }).catch(handleErr)
  );
solutions
  .command('list')
  .description('List solutions')
  .option('--table', 'Show output in aligned columns (default when TTY)')
  .addHelpText('after', '\nExamples:\n  bitcompass solutions list\n  bitcompass solutions list --table\n')
  .action((opts: { table?: boolean }) => runSolutionsList({ table: opts.table }).catch(handleErr));
solutions
  .command('pull [id]')
  .description('Pull a solution by ID or choose from list (creates symbolic link by default)')
  .option('-g, --global', 'Install globally to ~/.cursor/rules/ for all projects')
  .option('--copy', 'Copy file instead of creating symbolic link')
  .addHelpText(
    'after',
    '\nExamples:\n  bitcompass solutions pull <id>\n  bitcompass solutions pull <id> --global\n'
  )
  .action((id?: string, options?: { global?: boolean; copy?: boolean }) => runSolutionsPull(id, options).catch(handleErr));
solutions
  .command('push [file]')
  .description('Push a solution (file or interactive)')
  .option('--project-id <uuid>', 'Scope to Compass project (UUID)')
  .action((file?: string, opts?: { projectId?: string }) =>
    runSolutionsPush(file, { projectId: opts?.projectId }).catch(handleErr)
  );

// skills
const skills = program.command('skills').description('Manage skills');
skills
  .command('search [query]')
  .description('Search skills')
  .option('-l, --list', 'List results only; do not prompt to select')
  .action((query?: string, cmd?: { opts(): { list?: boolean } }) =>
    runSkillsSearch(query, { listOnly: cmd?.opts()?.list }).catch(handleErr)
  );
skills
  .command('list')
  .description('List skills')
  .option('--table', 'Show output in aligned columns (default when TTY)')
  .addHelpText('after', '\nExamples:\n  bitcompass skills list\n  bitcompass skills list --table\n')
  .action((opts: { table?: boolean }) => runSkillsList({ table: opts.table }).catch(handleErr));
skills
  .command('pull [id]')
  .description('Pull a skill by ID or choose from list (creates symbolic link by default)')
  .option('-g, --global', 'Install globally to ~/.cursor/rules/ for all projects')
  .option('--copy', 'Copy file instead of creating symbolic link')
  .addHelpText(
    'after',
    '\nExamples:\n  bitcompass skills pull <id>\n  bitcompass skills pull <id> --global\n'
  )
  .action((id?: string, options?: { global?: boolean; copy?: boolean }) => runSkillsPull(id, options).catch(handleErr));
skills
  .command('push [file]')
  .description('Push a skill (file or interactive)')
  .option('--project-id <uuid>', 'Scope to Compass project (UUID)')
  .action((file?: string, opts?: { projectId?: string }) =>
    runSkillsPush(file, { projectId: opts?.projectId }).catch(handleErr)
  );

// commands
const commands = program.command('commands').description('Manage commands');
commands
  .command('search [query]')
  .description('Search commands')
  .option('-l, --list', 'List results only; do not prompt to select')
  .action((query?: string, cmd?: { opts(): { list?: boolean } }) =>
    runCommandsSearch(query, { listOnly: cmd?.opts()?.list }).catch(handleErr)
  );
commands
  .command('list')
  .description('List commands')
  .option('--table', 'Show output in aligned columns (default when TTY)')
  .addHelpText('after', '\nExamples:\n  bitcompass commands list\n  bitcompass commands list --table\n')
  .action((opts: { table?: boolean }) => runCommandsList({ table: opts.table }).catch(handleErr));
commands
  .command('pull [id]')
  .description('Pull a command by ID or choose from list (creates symbolic link by default)')
  .option('-g, --global', 'Install globally to ~/.cursor/rules/ for all projects')
  .option('--copy', 'Copy file instead of creating symbolic link')
  .addHelpText(
    'after',
    '\nExamples:\n  bitcompass commands pull <id>\n  bitcompass commands pull <id> --global\n'
  )
  .action((id?: string, options?: { global?: boolean; copy?: boolean }) => runCommandsPull(id, options).catch(handleErr));
commands
  .command('push [file]')
  .description('Push a command (file or interactive)')
  .option('--project-id <uuid>', 'Scope to Compass project (UUID)')
  .action((file?: string, opts?: { projectId?: string }) =>
    runCommandsPush(file, { projectId: opts?.projectId }).catch(handleErr)
  );

// mcp
const mcp = program.command('mcp').description('MCP server');
mcp.command('start').description('Start MCP server (stdio)').action(() => runMcpStart().catch(handleErr));
mcp.command('status').description('Show MCP status').action(runMcpStatus);

function handleErr(err: unknown): void {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
}

if (process.argv.slice(2).length === 0) {
  console.log(
    chalk.cyan('BitCompass') +
      chalk.dim(' – rules, solutions, and MCP server. Run ') +
      chalk.cyan('bitcompass --help') +
      chalk.dim(' for commands.')
  );
  process.exit(0);
}

program.parse();
