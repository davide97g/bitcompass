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

  const rulesDir = getOutputDirForKind(config, 'rule');
  const rulePath = join(rulesDir, 'rule-bitcompass-mcp-and-cli-usage.md');
  const ruleContent = `# BitCompass MCP and CLI Usage

This project uses BitCompass for managing rules, solutions, skills, and commands. LLMs should use the available MCP tools and CLI commands when appropriate.

## Multi-Editor Support

BitCompass supports outputting to multiple editors simultaneously. During \`bitcompass init\`, select all editors you use (e.g. Cursor + Claude Code). Content is written to each editor's directory:

| Editor        | Base path         |
|---------------|-------------------|
| Cursor        | \`.cursor/\`       |
| Claude Code   | \`.claude/\`       |
| VSCode        | \`.vscode/\`       |
| Antigrativity | \`.antigrativity/\` |

## Output Folders and Formats

Each editor base path contains kind-specific subfolders:

| Type      | Subfolder        | Format | Notes |
|-----------|------------------|--------|--------|
| Rules     | \`rules/\`        | \`.mdc\` | YAML frontmatter: \`description\`, \`globs\`, \`alwaysApply\`. |
| Skills    | \`skills/{slug}/SKILL.md\` | \`.md\` | Subdirectory per skill. YAML frontmatter: \`name\`, \`description\`. |
| Commands  | \`commands/\`     | \`.md\` | Plain markdown, no frontmatter. |
| Solutions | \`documentation/\` | \`.md\` | Plain markdown, no frontmatter. |

Example with Cursor + Claude Code configured: pulling a skill creates both \`.cursor/skills/my-skill/SKILL.md\` and \`.claude/skills/my-skill/SKILL.md\`.

## Special Files

Some rules map to "special files" with hardcoded project-relative output paths. When pulled, they write directly to the target path (body only, no frontmatter) instead of a kind subfolder:

| Target key           | Output path                       | Description |
|----------------------|-----------------------------------|-------------|
| \`claude.md\`         | \`CLAUDE.md\`                      | Claude Code project instructions |
| \`agents.md\`         | \`AGENTS.md\`                      | OpenAI Codex instructions |
| \`cursorrules\`       | \`.cursorrules\`                   | Cursor legacy rules |
| \`copilot-instructions\` | \`.github/copilot-instructions.md\` | GitHub Copilot instructions |
| \`windsurfrules\`     | \`.windsurfrules\`                 | Windsurf rules |

Special files are auto-detected when sharing (e.g. \`bitcompass share CLAUDE.md\` auto-sets \`special_file_target: claude.md\`). They can also be set explicitly with \`--special-file\` or via the MCP \`post-rules\` tool.

## MCP Tools (Available in AI Editor)

### search-rules
Search rules by query. **Parameters:** \`query\` (required), \`kind\` (optional: rule/solution/skill/command), \`limit\` (optional, default 20).

### search-solutions
Search solutions by query. **Parameters:** \`query\` (required), \`limit\` (optional).

### post-rules
Publish a new rule, solution, skill, or command.

**Parameters:**
- \`kind\` (required): 'rule', 'solution', 'skill', or 'command'
- \`title\` (required), \`body\` (required)
- \`description\`, \`context\`, \`examples\`, \`technologies\` (optional)
- \`project_id\` (optional): Compass project UUID
- \`visibility\` (optional): 'private' (default) or 'public'
- \`special_file_target\` (optional): map to a special output file (e.g. 'claude.md', 'agents.md', 'cursorrules', 'copilot-instructions', 'windsurfrules')

### get-rule
Fetch complete rule by ID. **Parameters:** \`id\` (required), \`kind\` (optional filter).

### list-rules
Browse all rules. **Parameters:** \`kind\` (optional), \`limit\` (optional, default 50).

### update-rule
Edit an existing rule you own. **Parameters:** \`id\` (required), plus any fields to update.

### delete-rule
Remove a rule by ID. Requires ownership.

### pull-rule
Install a rule into the project. Writes to configured editor directories (or special file path). **Parameters:** \`id\` (required), \`output_path\` (optional), \`global\` (optional).

### pull-group
Pull all rules from a knowledge group. **Parameters:** \`id\` (required), \`output_path\` (optional), \`global\` (optional).

## CLI Commands

### Authentication
- \`bitcompass login\` - Log in with Google
- \`bitcompass logout\` - Remove credentials
- \`bitcompass whoami\` - Show current user

### Project Setup
- \`bitcompass init\` - Configure editors, output folder, Compass project link

### Rules / Skills / Commands / Solutions
Each kind supports: \`search [query]\`, \`list\`, \`pull [id]\`, \`push [file]\`.

- \`bitcompass rules pull [id]\` - Saves to \`<editor>/rules/\` as \`.mdc\`
- \`bitcompass skills pull [id]\` - Saves to \`<editor>/skills/{slug}/SKILL.md\`
- \`bitcompass commands pull [id]\` - Saves to \`<editor>/commands/\` as \`.md\`
- \`bitcompass solutions pull [id]\` - Saves to \`<editor>/documentation/\` as \`.md\`
- Use \`--global\` to install to \`~/.cursor/<folder>\`

### Share (Push)
- \`bitcompass share [file]\` - Publish to BitCompass (auto-detects kind and special file target)
- \`--kind <kind>\` - Explicitly set kind
- \`--special-file <target>\` - Map to a special output file (e.g. \`--special-file claude.md\`)

### Sync
- \`bitcompass sync\` - Sync local rules with Compass project (pull new, update changed)
- \`--prune\` - Remove locally installed items no longer in the project
- \`--check\` - Dry-run, show status only

### Configuration
- \`bitcompass config list\` - List all config values
- \`bitcompass config get <key>\` / \`set <key> <value>\` - Get/set config
- \`bitcompass config push\` - Share local project config with Compass project teammates
- \`bitcompass config pull\` - Pull shared config from Compass project

### MCP Server
- \`bitcompass mcp start\` - Start MCP server (stdio mode)
- \`bitcompass mcp status\` - Show status

## Decision Guide

**Use MCP tools when:** working in the AI editor, searching/publishing rules, or the user wants to share something.

**Use CLI commands when:** authenticating, pulling content to disk, syncing with a Compass project, or sharing config.

## Authentication Notes

- Most MCP tools require authentication (except search-rules and search-solutions)
- If you get an authentication error, instruct the user to run \`bitcompass login\` and restart the MCP server

## Best Practices

1. **Search before creating** - check if something similar exists
2. **Use descriptive titles** - clear, searchable names
3. **Set special file targets** for editor-specific config files (CLAUDE.md, .cursorrules, etc.)
4. **Use multi-editor** to keep all team editors in sync
5. **Share config** via \`bitcompass config push\` so teammates get the same editor setup
6. **Use \`--global\`** for content available across all projects
`;

  writeFileSync(rulePath, ruleContent, 'utf-8');

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
  console.log(INDENT + chalk.bold('Usage rule:'), rulePath);

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
