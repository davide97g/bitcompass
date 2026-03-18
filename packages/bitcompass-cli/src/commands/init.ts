import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import inquirer from 'inquirer';
import { homedir } from 'os';
import { basename, join, relative } from 'path';
import { fetchCompassProjectsForCurrentUser, insertRule } from '../api/client.js';
import { getCurrentUserEmail, isLoggedIn } from '../auth/config.js';
import {
    CURRENT_CONFIG_VERSION,
    EDITOR_BASE_PATHS,
    getEditorDefaultPath,
    getOutputDirForKind,
    getOutputDirsForKind,
    getProjectConfigDir,
    KIND_SUBFOLDERS,
    loadProjectConfig,
    saveProjectConfig,
} from '../auth/project-config.js';
import { gradient, printBanner } from '../lib/banner.js';
import type { EditorProvider, ProjectConfig, RuleInsert, RuleKind } from '../types.js';

const COMPASS_PROJECT_NONE = '';

const cyan: [number, number, number] = [0, 212, 255];
const magenta: [number, number, number] = [255, 64, 200];
const INDENT = '  ';

const EDITOR_CHOICES: { name: string; value: EditorProvider }[] = [
  { name: 'VSCode', value: 'vscode' },
  { name: 'Cursor', value: 'cursor' },
  { name: 'Antigrativity', value: 'antigrativity' },
  { name: 'Claude Code', value: 'claudecode' },
];

type GlobalGitignoreChoice = 'all' | 'cursor' | 'claude' | 'bitcompass';

const GLOBAL_GITIGNORE_CHECKBOX_CHOICES: { name: string; value: GlobalGitignoreChoice; checked: boolean }[] = [
  { name: 'All (Cursor, Claude, BitCompass)', value: 'all', checked: true },
  { name: 'Cursor', value: 'cursor', checked: true },
  { name: 'Claude', value: 'claude', checked: true },
  { name: 'BitCompass', value: 'bitcompass', checked: true },
];

const GLOBAL_GITIGNORE_BLOCKS: Record<Exclude<GlobalGitignoreChoice, 'all'>, string> = {
  cursor: `# Cursor
.cursor/
.cursor-cache/
.cursor-rules/
.cursor.json
`,
  claude: `# Claude
.claude/
`,
  bitcompass: `# BitCompass
.bitcompass/
.bitcompass
`,
};

function buildGlobalGitignoreContent(selected: GlobalGitignoreChoice[]): string {
  const include: readonly ('cursor' | 'claude' | 'bitcompass')[] = selected.includes('all')
    ? (['cursor', 'claude', 'bitcompass'] as const)
    : selected.filter((v): v is Exclude<GlobalGitignoreChoice, 'all'> => v !== 'all');
  const header = `##################################
# AI editors / assistants
##################################
`;
  const blocks = include.map((key) => GLOBAL_GITIGNORE_BLOCKS[key].trim()).join('\n\n');
  return (header + blocks).trim() + '\n';
}

/** One-time setup: create/update ~/.gitignore_global with AI patterns and set git config. Returns true if file was written (and optionally config set). */
const setupGlobalGitignore = (selected: GlobalGitignoreChoice[]): boolean => {
  const globalPath = join(homedir(), '.gitignore_global');
  const contentToWrite = buildGlobalGitignoreContent(selected);
  try {
    if (!existsSync(globalPath)) {
      writeFileSync(globalPath, contentToWrite, 'utf-8');
    } else {
      const content = readFileSync(globalPath, 'utf-8');
      const hasAiSection = content.includes('# AI editors / assistants');
      if (!hasAiSection) {
        const trimmed = content.trimEnd();
        const suffix = trimmed ? '\n\n' : '';
        writeFileSync(globalPath, `${trimmed}${suffix}${contentToWrite}`, 'utf-8');
      }
    }
  } catch (err) {
    console.error(
      chalk.red('Could not write ~/.gitignore_global:'),
      err instanceof Error ? err.message : err
    );
    return false;
  }
  try {
    execSync(`git config --global core.excludesFile ${JSON.stringify(globalPath)}`, {
      encoding: 'utf-8',
    });
  } catch {
    console.log(
      chalk.dim(
        'Could not set global git config. Run manually: git config --global core.excludesFile ~/.gitignore_global'
      )
    );
  }
  return true;
};

/** Well-known AI rule/config file patterns to scan for. */
interface DiscoveredRule {
  title: string;
  path: string;
  kind: RuleKind;
  /** When set, maps to a special output file (e.g. 'claude.md' → CLAUDE.md). */
  special_file_target?: string;
}

const discoverLocalRules = (cwd: string): DiscoveredRule[] => {
  const found: DiscoveredRule[] = [];

  const tryFile = (relPath: string, title: string, kind: RuleKind, special_file_target?: string) => {
    const abs = join(cwd, relPath);
    if (existsSync(abs)) {
      found.push({ title, path: relPath, kind, special_file_target });
    }
  };

  const tryDir = (relDir: string, ext: string, kind: RuleKind, prefix: string) => {
    const abs = join(cwd, relDir);
    if (!existsSync(abs)) return;
    try {
      const entries = readdirSync(abs, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(ext)) {
          const name = entry.name.replace(/\.[^.]+$/, '');
          found.push({
            title: `${prefix}: ${name}`,
            path: join(relDir, entry.name),
            kind,
          });
        }
      }
    } catch { /* ignore permission errors */ }
  };

  // Claude Code
  tryFile('CLAUDE.md', 'Claude Code rules (CLAUDE.md)', 'rule', 'claude.md');
  tryDir('.claude/commands', '.md', 'command', 'Claude command');

  // Cursor
  tryFile('.cursorrules', 'Cursor rules (.cursorrules)', 'rule', 'cursorrules');
  tryDir('.cursor/rules', '.mdc', 'rule', 'Cursor rule');
  tryDir('.cursor/rules', '.md', 'rule', 'Cursor rule');

  // GitHub Copilot
  tryFile('.github/copilot-instructions.md', 'GitHub Copilot instructions', 'rule', 'copilot-instructions');

  // Windsurf
  tryFile('.windsurfrules', 'Windsurf rules (.windsurfrules)', 'rule', 'windsurfrules');

  // Aider
  tryFile('.aider.conf.yml', 'Aider config (.aider.conf.yml)', 'rule');
  tryFile('.aiderignore', 'Aider ignore (.aiderignore)', 'rule');

  // Continue
  tryFile('.continue/config.json', 'Continue config', 'rule');
  tryFile('.continuerules', 'Continue rules (.continuerules)', 'rule');

  return found;
};

const importDiscoveredRules = async (
  rules: DiscoveredRule[],
  cwd: string,
  compassProjectId: string | null
): Promise<number> => {
  let imported = 0;
  for (const rule of rules) {
    const absPath = join(cwd, rule.path);
    const body = readFileSync(absPath, 'utf-8');
    const payload: RuleInsert = {
      kind: rule.kind,
      title: rule.title,
      description: `Imported from ${rule.path}`,
      body,
      project_id: compassProjectId,
      version: '1.0.0',
      visibility: 'private',
      special_file_target: rule.special_file_target ?? undefined,
    };
    try {
      await insertRule(payload);
      imported++;
    } catch (err) {
      console.log(
        chalk.yellow(`  Could not import ${rule.path}: `) +
        chalk.dim(err instanceof Error ? err.message : String(err))
      );
    }
  }
  return imported;
};

export const runInit = async (): Promise<void> => {
  await printBanner();

  const existing = loadProjectConfig();

  // Offer migration for old configs
  if (
    existing &&
    (existing.configVersion === undefined || existing.configVersion < CURRENT_CONFIG_VERSION)
  ) {
    const { shouldMigrate } = await inquirer.prompt<{ shouldMigrate: boolean }>([
      {
        name: 'shouldMigrate',
        message: 'Your project was set up with an older version of BitCompass. Run migration now?',
        type: 'confirm',
        default: true,
      },
    ]);
    if (shouldMigrate) {
      const { runMigrate } = await import('./migrate.js');
      await runMigrate();
      console.log('');
    }
  }
  const { editors: selectedEditors } = await inquirer.prompt<{ editors: EditorProvider[] }>([
    {
      name: 'editors',
      message: 'Editor / AI providers (select all that apply)',
      type: 'checkbox',
      choices: EDITOR_CHOICES.map((c) => ({
        ...c,
        checked: existing?.editors
          ? existing.editors.includes(c.value)
          : c.value === (existing?.editor ?? 'cursor'),
      })),
      validate: (input: EditorProvider[]) =>
        input.length > 0 || 'Select at least one editor',
    },
  ]);
  const answers = await inquirer.prompt<{
    outputPath: string;
    setupGlobalGitignore: boolean;
  }>([
    {
      name: 'outputPath',
      message: 'Folder for rules/docs/commands output (primary)',
      type: 'input',
      default: getEditorDefaultPath(selectedEditors[0]),
    },
    {
      name: 'setupGlobalGitignore',
      message: 'Set up global gitignore for AI editor folders? (one-time: ~/.gitignore_global)',
      type: 'confirm',
      default: false,
    },
  ]);

  let compassProjectId: string | null = null;
  if (isLoggedIn()) {
    const projects = await fetchCompassProjectsForCurrentUser();
    const choices: { name: string; value: string }[] = [
      { name: 'Nessuno / solo personale', value: COMPASS_PROJECT_NONE },
      ...projects.map((p) => ({
        name: p.description ? `${p.title} – ${p.description}` : p.title,
        value: p.id,
      })),
    ];
    const { compassProject } = await inquirer.prompt<{ compassProject: string }>([
      {
        name: 'compassProject',
        message: 'A quale Compass project stai lavorando in questa cartella?',
        type: 'list',
        choices,
      },
    ]);
    compassProjectId = compassProject === COMPASS_PROJECT_NONE ? null : compassProject;
  } else {
    console.log(
      chalk.dim(
        'Non sei loggato. Esegui bitcompass login e poi bitcompass init per associare un Compass project.'
      )
    );
  }

  const primaryEditor = selectedEditors[0];
  const config: ProjectConfig = {
    editor: primaryEditor,
    outputPath: answers.outputPath.trim() || getEditorDefaultPath(primaryEditor),
    editors: selectedEditors,
    compassProjectId,
    configVersion: CURRENT_CONFIG_VERSION,
  };

  saveProjectConfig(config);

  // Create all four output folders for ALL configured editors
  const kinds = Object.keys(KIND_SUBFOLDERS) as import('../types.js').RuleKind[];
  for (const kind of kinds) {
    const dirs = getOutputDirsForKind(config, kind);
    for (const dir of dirs) {
      mkdirSync(dir, { recursive: true });
    }
  }

  // Discover local AI rules/configs and offer to import them
  let importedCount = 0;
  if (isLoggedIn()) {
    const discovered = discoverLocalRules(process.cwd());
    if (discovered.length > 0) {
      console.log('');
      console.log(chalk.bold('Found local AI rules/configs:'));
      const { toImport } = await inquirer.prompt<{ toImport: DiscoveredRule[] }>([
        {
          name: 'toImport',
          message: 'Import into your private BitCompass database?',
          type: 'checkbox',
          choices: discovered.map((r) => ({
            name: `${r.title}  ${chalk.dim(`(${r.path})`)}`,
            value: r,
            checked: false,
          })),
        },
      ]);
      if (toImport.length > 0) {
        console.log(chalk.dim('Importing…'));
        importedCount = await importDiscoveredRules(toImport, process.cwd(), compassProjectId);
        console.log(chalk.green(`Imported ${importedCount} rule(s) as private.`));
      }
    }
  }

  // Generate usage skill (skill format replaces old rule format)
  const skillsDir = getOutputDirForKind(config, 'skill');
  const skillDir = join(skillsDir, 'bitcompass-usage');
  mkdirSync(skillDir, { recursive: true });
  const skillPath = join(skillDir, 'SKILL.md');
  const skillContent = `---
name: bitcompass-usage
description: How to use BitCompass MCP tools, CLI commands, and slash commands for managing rules, solutions, skills, and commands
---

# BitCompass Usage Guide

You have access to BitCompass for managing rules, solutions, skills, and commands. Use this guide to decide which tool to use.

## Decision Guide

| Need | Use | Why |
|------|-----|-----|
| Search/browse content | MCP tools (\\\`search-rules\\\`, \\\`list-rules\\\`) | Direct from editor, no terminal needed |
| Publish new content | \\\`/share\\\` command or \\\`post-rules\\\` MCP tool | Guided workflow with duplicate checking |
| Update existing content | \\\`/update-content\\\` command or \\\`update-rule\\\` MCP tool | Find → review → edit flow |
| Pull content to project | \\\`/pull-content\\\` command or \\\`pull-rule\\\` MCP tool | Search → select → install flow |
| Sync with Compass project | \\\`/sync-project\\\` command or \\\`bitcompass sync\\\` CLI | Bulk sync delegated to CLI |
| Login/auth | \\\`bitcompass login\\\` CLI | Requires browser, terminal only |
| First-time setup | \\\`bitcompass setup\\\` CLI | Login + init + sync in one step |
| Project configuration | \\\`bitcompass init\\\` CLI | Interactive editor/output setup |

## Slash Commands

- \\\`/share\\\` — Publish new content to BitCompass (guided: determine kind, check duplicates, collect fields, publish, offer pull)
- \\\`/update-content\\\` — Find and update existing content you own
- \\\`/pull-content\\\` — Search and pull content into this project
- \\\`/sync-project\\\` — Sync local files with linked Compass project

## MCP Tools

### search-rules
Search by keyword. **Params:** \\\`query\\\` (required), \\\`kind\\\` (optional: rule/solution/skill/command), \\\`limit\\\` (optional, default 20).

### search-solutions
Search solutions specifically. **Params:** \\\`query\\\` (required), \\\`limit\\\` (optional).

### post-rules
Publish new content. **Params:** \\\`kind\\\` (required: rule/solution/skill/command), \\\`title\\\` (required), \\\`body\\\` (required), \\\`description\\\`, \\\`context\\\`, \\\`examples\\\`, \\\`technologies\\\`, \\\`project_id\\\`, \\\`visibility\\\` (private/public), \\\`special_file_target\\\` (optional).

### get-rule
Fetch full content by ID. **Params:** \\\`id\\\` (required), \\\`kind\\\` (optional filter).

### list-rules
Browse all content. **Params:** \\\`kind\\\` (optional), \\\`limit\\\` (optional, default 50).

### update-rule
Edit content you own. **Params:** \\\`id\\\` (required), plus any fields to update.

### delete-rule
Remove by ID (requires ownership). **Params:** \\\`id\\\` (required).

### pull-rule
Install into project. **Params:** \\\`id\\\` (required), \\\`output_path\\\` (optional), \\\`global\\\` (optional).

### pull-group
Pull all rules from a knowledge group. **Params:** \\\`id\\\` (required), \\\`output_path\\\` (optional), \\\`global\\\` (optional).

## CLI Commands

### Authentication
- \\\`bitcompass login\\\` — Log in with Google
- \\\`bitcompass logout\\\` — Remove credentials
- \\\`bitcompass whoami\\\` — Show current user

### Project Setup
- \\\`bitcompass setup\\\` — Quick onboarding: login → init → sync (skips completed steps)
- \\\`bitcompass init\\\` — Configure editors, output folder, Compass project link
- \\\`bitcompass migrate\\\` — Migrate from older BitCompass versions

### Content Management
Each kind (rules, skills, commands, solutions) supports: \\\`search [query]\\\`, \\\`list\\\`, \\\`pull [id]\\\`, \\\`push [file]\\\`.
- \\\`bitcompass share [file]\\\` — Publish (auto-detects kind and special file target)
- \\\`bitcompass sync\\\` — Sync local files with Compass project (\\\`--check\\\`, \\\`--all -y\\\`, \\\`--prune\\\`)
- \\\`bitcompass update\\\` — Check for and apply updates to installed content

### Configuration
- \\\`bitcompass config list\\\` / \\\`get <key>\\\` / \\\`set <key> <value>\\\` — Manage config
- \\\`bitcompass config push\\\` / \\\`pull\\\` — Share/pull config with Compass project teammates

## Multi-Editor Support

BitCompass outputs to multiple editors simultaneously. Content is written to each editor's directory:

| Editor | Base path | Rules | Skills | Commands | Solutions |
|--------|-----------|-------|--------|----------|-----------|
| Cursor | \\\`.cursor/\\\` | \\\`rules/\\\` (.mdc) | \\\`skills/{slug}/SKILL.md\\\` | \\\`commands/\\\` (.md) | \\\`documentation/\\\` (.md) |
| Claude Code | \\\`.claude/\\\` | \\\`rules/\\\` (.mdc) | \\\`skills/{slug}/SKILL.md\\\` | \\\`commands/\\\` (.md) | \\\`documentation/\\\` (.md) |
| VSCode | \\\`.vscode/\\\` | same layout | same layout | same layout | same layout |

## Special Files

Some rules map to hardcoded output paths: \\\`claude.md\\\` → \\\`CLAUDE.md\\\`, \\\`agents.md\\\` → \\\`AGENTS.md\\\`, \\\`cursorrules\\\` → \\\`.cursorrules\\\`, \\\`copilot-instructions\\\` → \\\`.github/copilot-instructions.md\\\`, \\\`windsurfrules\\\` → \\\`.windsurfrules\\\`.

## Authentication Notes

- Most MCP tools require authentication (except \\\`search-rules\\\` and \\\`search-solutions\\\`)
- If you get an auth error, instruct the user to run \\\`bitcompass login\\\` and restart the MCP server
- \\\`post-rules\\\` auto-detects the Compass project from local config when \\\`project_id\\\` is not provided

## Best Practices

1. **Search before creating** — check for duplicates with \\\`search-rules\\\`
2. **Use descriptive titles** — clear, searchable names
3. **Set special file targets** for editor-specific config files
4. **Use multi-editor** to keep all team editors in sync
5. **Share config** via \\\`bitcompass config push\\\` so teammates get the same setup
`;

  writeFileSync(skillPath, skillContent, 'utf-8');

  let globalGitignoreSelected: GlobalGitignoreChoice[] = [];
  if (answers.setupGlobalGitignore) {
    const { whatToGitignore } = await inquirer.prompt<{ whatToGitignore: GlobalGitignoreChoice[] }>({
      name: 'whatToGitignore',
      message: 'What should be gitignored?',
      type: 'checkbox',
      choices: GLOBAL_GITIGNORE_CHECKBOX_CHOICES,
    });
    globalGitignoreSelected = whatToGitignore.length > 0 ? whatToGitignore : ['all'];
  }
  const globalGitignoreOk =
    answers.setupGlobalGitignore && setupGlobalGitignore(globalGitignoreSelected);

  console.log(gradient('Project configured.', cyan, magenta));
  console.log(INDENT + chalk.bold('Config:'), join(getProjectConfigDir(), 'config.json'));
  console.log(INDENT + chalk.bold('Editors:'), selectedEditors.join(', '));
  console.log(INDENT + chalk.bold('Output path:'), config.outputPath);
  console.log(
    INDENT + chalk.bold('Compass project:'),
    config.compassProjectId ?? 'none (personal only)'
  );
  console.log(INDENT + chalk.bold('Folders:'), 'rules, skills, commands, documentation');
  if (globalGitignoreOk) {
    console.log(
      INDENT + chalk.bold('Global gitignore:'),
      '~/.gitignore_global configured (AI editor folders).'
    );
  }
  console.log(INDENT + chalk.bold('Usage skill:'), skillPath);

  const email = getCurrentUserEmail();
  const loggedIn = isLoggedIn();
  console.log('');
  if (loggedIn) {
    console.log(
      email
        ? 'You are ready to go ' + chalk.bold(email) + '!'
        : 'You are ready to go!'
    );
  } else {
    console.log(
      chalk.dim('Run ') + chalk.cyan('bitcompass login') + chalk.dim(' to sign in.')
    );
  }
};
