#!/usr/bin/env node

import 'dotenv/config';

import chalk from 'chalk';
import { Command } from 'commander';
import { runConfigGet, runConfigList, runConfigSet } from './commands/config-cmd.js';
import { runLogin } from './commands/login.js';
import { runLogout } from './commands/logout.js';
import { runMcpStart, runMcpStatus } from './commands/mcp.js';
import { runRulesList, runRulesPull, runRulesPush, runRulesSearch } from './commands/rules.js';
import { runSolutionsPull, runSolutionsPush, runSolutionsSearch } from './commands/solutions.js';
import { runWhoami } from './commands/whoami.js';

const program = new Command();

program
  .name('bitcompass')
  .description('BitCompass CLI - rules, solutions, and MCP server')
  .version('0.1.0');

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

const configCmd = program.command('config').description('Show or set config');
configCmd.action(runConfigList);
configCmd.command('list').description('List config values').action(runConfigList);
configCmd.command('set <key> <value>').description('Set supabaseUrl, supabaseAnonKey, or apiUrl').action((key: string, value: string) => runConfigSet(key, value));
configCmd.command('get <key>').description('Get a config value').action((key: string) => runConfigGet(key));

// rules
const rules = program.command('rules').description('Manage rules');
rules.command('search [query]').description('Search rules').action((query?: string) => runRulesSearch(query).catch(handleErr));
rules.command('list').description('List rules').action(() => runRulesList().catch(handleErr));
rules.command('pull [id]').description('Pull a rule by ID or choose from list').action((id?: string) => runRulesPull(id).catch(handleErr));
rules.command('push [file]').description('Push a rule (file or interactive)').action((file?: string) => runRulesPush(file).catch(handleErr));

// solutions
const solutions = program.command('solutions').description('Manage solutions');
solutions.command('search [query]').description('Search solutions').action((query?: string) => runSolutionsSearch(query).catch(handleErr));
solutions.command('pull [id]').description('Pull a solution by ID or choose from list').action((id?: string) => runSolutionsPull(id).catch(handleErr));
solutions.command('push [file]').description('Push a solution (file or interactive)').action((file?: string) => runSolutionsPush(file).catch(handleErr));

// mcp
const mcp = program.command('mcp').description('MCP server');
mcp.command('start').description('Start MCP server (stdio)').action(() => runMcpStart().catch(handleErr));
mcp.command('status').description('Show MCP status').action(runMcpStatus);

function handleErr(err: unknown): void {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
}

program.parse();
