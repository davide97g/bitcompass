#!/usr/bin/env node

import 'dotenv/config';

import chalk from 'chalk';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { runCommandsList, runCommandsPull, runCommandsPush, runCommandsSearch } from './commands/commands.js';
import { runConfigGet, runConfigList, runConfigSet } from './commands/config-cmd.js';
import { runGlossary } from './commands/glossary.js';
import { runInit } from './commands/init.js';
import { runLogin } from './commands/login.js';
import { runSetup } from './commands/setup.js';
import { runLogout } from './commands/logout.js';
import { runMcpStart, runMcpStatus } from './commands/mcp.js';
import { runRulesList, runRulesPull, runRulesPush, runRulesSearch } from './commands/rules.js';
import { runGroupList, runGroupPull, runGroupSync } from './commands/group.js';
import { runProjectList, runProjectPull, runProjectSync } from './commands/project.js';
import { runSharePush } from './commands/share.js';
import { runSync } from './commands/sync.js';
import { runSkillsList, runSkillsPull, runSkillsPush, runSkillsSearch } from './commands/skills.js';
import { runDocsList, runDocsPull, runDocsPush, runDocsSearch } from './commands/docs.js';
import { runUpdate } from './commands/update.js';
import { runWhoami } from './commands/whoami.js';
import { runMigrate } from './commands/migrate.js';
import { runSelfUpdate } from './commands/self-update.js';
import { checkForCliUpdate } from './lib/version-check.js';

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
  .description('BitCompass CLI - rules, docs, and MCP server')
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
  .description('Show glossary (rules, docs, skills, commands)')
  .action(runGlossary);

program
  .command('share [file]')
  .description('Share a rule, doc, skill, or command (prompts for type if not in file or --kind)')
  .option('-k, --kind <kind>', 'Type: rule, documentation, skill, or command (skips type prompt)')
  .option('--project-id <uuid>', 'Scope to Compass project (UUID)')
  .option('--special-file <target>', 'Map to a special output file (claude.md, agents.md, cursorrules, copilot-instructions, windsurfrules)')
  .option('--force-new', 'Always create a new item, even if the file has an existing ID')
  .option('--relative-path <path>', 'Subdirectory relative to project root for monorepo scoping (e.g. packages/frontend)')
  .addHelpText(
    'after',
    `
Examples:
  bitcompass share
  bitcompass share ./my-rule.mdc
  bitcompass share ./doc.md --kind documentation
  bitcompass share CLAUDE.md --special-file claude.md
  bitcompass share ./rule.mdc --relative-path packages/frontend
`
  )
  .action((file?: string, opts?: { kind?: string; projectId?: string; specialFile?: string; forceNew?: boolean; relativePath?: string }) => {
    const kind = opts?.kind as 'rule' | 'documentation' | 'skill' | 'command' | undefined;
    if (opts?.kind && kind !== 'rule' && kind !== 'documentation' && kind !== 'skill' && kind !== 'command') {
      console.error(chalk.red('--kind must be one of: rule, documentation, skill, command'));
      process.exit(1);
    }
    return runSharePush(file, { kind, projectId: opts?.projectId, specialFile: opts?.specialFile, forceNew: opts?.forceNew, relativePath: opts?.relativePath }).catch(handleErr);
  });

program
  .command('setup')
  .description('Quick onboarding: login → init → sync (skips completed steps)')
  .action(() => runSetup().catch(handleErr));

program
  .command('init')
  .description('Configure project: editor/AI provider and output folder for rules/docs/commands')
  .action(() => runInit().catch(handleErr));

program
  .command('update')
  .description('Check for and apply updates to installed rules, skills, commands, and docs')
  .option('--check', 'List available updates only; do not apply')
  .option('--all', 'Select all updatable items')
  .option('-y, --yes', 'Apply updates without confirmation (use with --all for non-interactive)')
  .option('--global', 'Operate on global installs (~/.cursor/...) instead of project')
  .option('--kind <kind>', 'Limit to one kind: rule, skill, command, or documentation')
  .addHelpText(
    'after',
    `
Examples:
  bitcompass update
  bitcompass update --check
  bitcompass update --all -y
  bitcompass update --global --kind rule
`
  )
  .action((opts?: { check?: boolean; all?: boolean; yes?: boolean; global?: boolean; kind?: string }) => {
    const kind = opts?.kind as 'rule' | 'skill' | 'command' | 'documentation' | undefined;
    if (opts?.kind && kind !== 'rule' && kind !== 'skill' && kind !== 'command' && kind !== 'documentation') {
      console.error(chalk.red('--kind must be one of: rule, skill, command, documentation'));
      process.exit(1);
    }
    return runUpdate({
      check: opts?.check,
      all: opts?.all,
      yes: opts?.yes,
      global: opts?.global,
      kind,
    }).catch(handleErr);
  });

program
  .command('sync')
  .description('Sync local rules/skills/commands/docs with the linked Compass project')
  .option('--check', 'Show sync status only; do not apply changes')
  .option('-a, --all', 'Sync all items without interactive selection')
  .option('-y, --yes', 'Skip confirmation prompt (use with --all for non-interactive)')
  .option('--prune', 'Also remove local items no longer in the project')
  .option('-g, --global', 'Operate on global installs (~/.cursor/...)')
  .addHelpText(
    'after',
    `
Examples:
  bitcompass sync
  bitcompass sync --check
  bitcompass sync --all -y
  bitcompass sync --prune
`
  )
  .action((opts?: { check?: boolean; all?: boolean; yes?: boolean; prune?: boolean; global?: boolean }) =>
    runSync({
      check: opts?.check,
      all: opts?.all,
      yes: opts?.yes,
      prune: opts?.prune,
      global: opts?.global,
    }).catch(handleErr)
  );

const configCmd = program.command('config').description('Show or set config (interactive TUI when run without subcommand)');
configCmd.action(async () => {
  const { runConfigTui } = await import('./commands/config-tui.js');
  return runConfigTui().catch(handleErr);
});
configCmd.command('list').description('List config values').action(runConfigList);
configCmd.command('set <key> <value>').description('Set supabaseUrl, supabaseAnonKey, or apiUrl').action((key: string, value: string) => runConfigSet(key, value));
configCmd.command('get <key>').description('Get a config value').action((key: string) => runConfigGet(key));
configCmd
  .command('push')
  .description('Push local project config to the linked Compass project')
  .action(async () => {
    const { runConfigPush } = await import('./commands/config-cmd.js');
    return runConfigPush().catch(handleErr);
  });
configCmd
  .command('pull')
  .description('Pull project config from the linked Compass project')
  .action(async () => {
    const { runConfigPull } = await import('./commands/config-cmd.js');
    return runConfigPull().catch(handleErr);
  });

// project (Compass project for this folder: pull, sync, list)
const projectCmd = program.command('project').description('Compass project for this folder (see bitcompass init)');
projectCmd
  .command('pull')
  .description(
    'Pull selected (or all with --all) rules, skills, commands, and docs from the Compass project'
  )
  .option('-g, --global', 'Install globally to ~/.cursor/...')
  .option('--copy', 'Copy files instead of symbolic links')
  .option('-a, --all', 'Pull all items without prompting (non-interactive)')
  .action((opts?: { global?: boolean; copy?: boolean; all?: boolean }) =>
    runProjectPull(opts).catch(handleErr)
  );
projectCmd
  .command('sync')
  .description('Sync local rules/skills/commands/docs with the configured Compass project (pull new, update changed, optionally prune removed)')
  .option('--prune', 'Remove local files that are no longer in the project')
  .option('-g, --global', 'Operate on global installs')
  .action((opts?: { prune?: boolean; global?: boolean }) => runProjectSync(opts).catch(handleErr));
projectCmd
  .command('list')
  .description('Show the Compass project configured for this folder')
  .action(() => runProjectList().catch(handleErr));

// group (knowledge groups: pull, sync, list)
const groupCmd = program.command('group').description('Pull/sync rules by knowledge group');
groupCmd
  .command('pull <id>')
  .description('Pull all rules in a group (and sub-groups)')
  .option('-g, --global', 'Install globally to ~/.cursor/...')
  .option('--copy', 'Copy files instead of symbolic links')
  .option('-a, --all', 'Pull all items without prompting (non-interactive)')
  .action((id: string, opts?: { global?: boolean; copy?: boolean; all?: boolean }) =>
    runGroupPull(id, opts).catch(handleErr)
  );
groupCmd
  .command('sync <id>')
  .description('Sync local rules with a group (pull new, optionally prune)')
  .option('--prune', 'Remove local files that are no longer in the group')
  .option('-g, --global', 'Operate on global installs')
  .action((id: string, opts?: { prune?: boolean; global?: boolean }) =>
    runGroupSync(id, opts).catch(handleErr)
  );
groupCmd
  .command('list')
  .description('List available groups')
  .action(() => runGroupList().catch(handleErr));

// rules
const rules = program.command('rules').description('Manage rules');
rules
  .command('search [query]')
  .description('Search rules')
  .option('-l, --list', 'List results only; do not prompt to select')
  .action((query?: string, opts?: { list?: boolean }) =>
    runRulesSearch(query, { listOnly: opts?.list }).catch(handleErr)
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

// docs (documentation)
const docs = program.command('docs').description('Manage documentation');
docs
  .command('search [query]')
  .description('Search docs')
  .option('-l, --list', 'List results only; do not prompt to select')
  .action((query?: string, opts?: { list?: boolean }) =>
    runDocsSearch(query, { listOnly: opts?.list }).catch(handleErr)
  );
docs
  .command('list')
  .description('List docs')
  .option('--table', 'Show output in aligned columns (default when TTY)')
  .addHelpText('after', '\nExamples:\n  bitcompass docs list\n  bitcompass docs list --table\n')
  .action((opts: { table?: boolean }) => runDocsList({ table: opts.table }).catch(handleErr));
docs
  .command('pull [id]')
  .description('Pull a doc by ID or choose from list (creates symbolic link by default)')
  .option('-g, --global', 'Install globally to ~/.cursor/rules/ for all projects')
  .option('--copy', 'Copy file instead of creating symbolic link')
  .addHelpText(
    'after',
    '\nExamples:\n  bitcompass docs pull <id>\n  bitcompass docs pull <id> --global\n'
  )
  .action((id?: string, options?: { global?: boolean; copy?: boolean }) => runDocsPull(id, options).catch(handleErr));
docs
  .command('push [file]')
  .description('Push a doc (file or interactive)')
  .option('--project-id <uuid>', 'Scope to Compass project (UUID)')
  .action((file?: string, opts?: { projectId?: string }) =>
    runDocsPush(file, { projectId: opts?.projectId }).catch(handleErr)
  );

// skills
const skills = program.command('skills').description('Manage skills');
skills
  .command('search [query]')
  .description('Search skills')
  .option('-l, --list', 'List results only; do not prompt to select')
  .action((query?: string, opts?: { list?: boolean }) =>
    runSkillsSearch(query, { listOnly: opts?.list }).catch(handleErr)
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
  .action((query?: string, opts?: { list?: boolean }) =>
    runCommandsSearch(query, { listOnly: opts?.list }).catch(handleErr)
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

// migrate
program
  .command('migrate')
  .description('Migrate project files from older BitCompass versions to current layout')
  .option('--dry-run', 'Show what would be changed without modifying files')
  .action((opts?: { dryRun?: boolean }) => runMigrate({ dryRun: opts?.dryRun }).catch(handleErr));

// self-update
program
  .command('self-update')
  .description('Update BitCompass CLI to the latest version')
  .action(() => runSelfUpdate().catch(handleErr));

function handleErr(err: unknown): void {
  console.error(chalk.red(err instanceof Error ? err.message : String(err)));
  process.exit(1);
}

// Check for CLI updates (cached, non-blocking) for all commands except mcp start (stdio)
const subcommand = process.argv[2];
if (subcommand && subcommand !== 'mcp' && subcommand !== 'self-update' && subcommand !== '--version' && subcommand !== '-v' && subcommand !== '-V') {
  checkForCliUpdate(version);
}

const userArgs = process.argv.slice(2);
const commandNames = program.commands.map((c) => c.name());
const hasCommand = userArgs.some((a) => commandNames.includes(a));
const hasFlags = userArgs.some((a) => a.startsWith('-'));
const cols = process.stdout.columns || 80;
const rows = process.stdout.rows || 24;

if (!hasCommand && !hasFlags && process.stdout.isTTY && cols >= 60 && rows >= 20) {
  const { launchTui } = await import('./tui/App.js');
  await launchTui(program);
  process.exit(0);
}

program.parse();
