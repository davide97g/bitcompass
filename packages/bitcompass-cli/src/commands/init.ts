import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import inquirer from 'inquirer';
import { homedir } from 'os';
import { basename, join, relative } from 'path';
import { fetchCompassProjectsForCurrentUser, insertRule } from '../api/client.js';
import { getCurrentUserEmail, isLoggedIn } from '../auth/config.js';
import {
    getEditorDefaultPath,
    getOutputDirForKind,
    getProjectConfigDir,
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
}

const discoverLocalRules = (cwd: string): DiscoveredRule[] => {
  const found: DiscoveredRule[] = [];

  const tryFile = (relPath: string, title: string, kind: RuleKind) => {
    const abs = join(cwd, relPath);
    if (existsSync(abs)) {
      found.push({ title, path: relPath, kind });
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
  tryFile('CLAUDE.md', 'Claude Code rules (CLAUDE.md)', 'rule');
  tryDir('.claude/commands', '.md', 'command', 'Claude command');

  // Cursor
  tryFile('.cursorrules', 'Cursor rules (.cursorrules)', 'rule');
  tryDir('.cursor/rules', '.mdc', 'rule', 'Cursor rule');
  tryDir('.cursor/rules', '.md', 'rule', 'Cursor rule');

  // GitHub Copilot
  tryFile('.github/copilot-instructions.md', 'GitHub Copilot instructions', 'rule');

  // Windsurf
  tryFile('.windsurfrules', 'Windsurf rules (.windsurfrules)', 'rule');

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
  const answers = await inquirer.prompt<{
    editor: EditorProvider;
    outputPath: string;
    setupGlobalGitignore: boolean;
  }>([
    {
      name: 'editor',
      message: 'Editor / AI provider',
      type: 'list',
      choices: EDITOR_CHOICES,
      default: existing?.editor ?? 'cursor',
    },
    {
      name: 'outputPath',
      message: 'Folder for rules/docs/commands output',
      type: 'input',
      default: ({ editor }: { editor: EditorProvider }) => getEditorDefaultPath(editor),
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

  const config: ProjectConfig = {
    editor: answers.editor,
    outputPath: answers.outputPath.trim() || getEditorDefaultPath(answers.editor),
    compassProjectId,
  };

  saveProjectConfig(config);

  // Create all four output folders (rules, skills, commands, documentation)
  const rulesDir = getOutputDirForKind(config, 'rule');
  const skillsDir = getOutputDirForKind(config, 'skill');
  const commandsDir = getOutputDirForKind(config, 'command');
  const documentationDir = getOutputDirForKind(config, 'solution');
  mkdirSync(rulesDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });
  mkdirSync(commandsDir, { recursive: true });
  mkdirSync(documentationDir, { recursive: true });

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

  const rulePath = join(rulesDir, 'rule-bitcompass-mcp-and-cli-usage.md');
  const ruleContent = `# BitCompass MCP and CLI Usage

This project uses BitCompass for managing rules, solutions, skills, and commands. LLMs should use the available MCP tools and CLI commands when appropriate.

## Output Folders and Formats (CLI and MCP)

When you run \`bitcompass init\`, the project is configured with a base output path (e.g. \`.cursor\`). Pull and MCP save content into separate folders by type:

| Type      | Folder           | Format | Notes |
|-----------|------------------|--------|--------|
| Rules     | \`.cursor/rules\` | \`.mdc\` | YAML frontmatter: \`description\`, \`globs\`, \`alwaysApply\`. Same as Cursor rules (see create-rule). |
| Skills    | \`.cursor/skills\` | \`.md\` | YAML frontmatter: \`name\`, \`description\` only. Matches create-skill SKILL.md format. |
| Commands  | \`.cursor/commands\` | \`.md\` | Plain markdown, no frontmatter (no description/alwaysApply). |
| Solutions | \`.cursor/documentation\` | \`.md\` | Plain markdown, no frontmatter. |

- **CLI:** \`bitcompass rules pull\`, \`bitcompass skills pull\`, \`bitcompass commands pull\`, \`bitcompass solutions pull\` save to these project folders (or \`--global\` to \`~/.cursor/<folder>\`).
- **MCP:** \`pull-rule\` uses the same project config unless \`output_path\` is provided; then that path is used as the base and kind subfolders are created under it.

When creating new skills or rules from scratch, follow the same conventions as the create-skill and create-rule workflows: skills in \`.cursor/skills/\` with \`name\` and \`description\` in frontmatter; rules in \`.cursor/rules/\` as \`.mdc\` with \`description\`, \`globs\`, \`alwaysApply\`.

## MCP Tools (Available in AI Editor)

Use these tools directly from the AI editor when available:

### search-rules
Search BitCompass rules by query.

**When to use:** When you need to find existing rules or patterns that might help solve a problem.

**Parameters:**
- \`query\` (required): Search query string
- \`kind\` (optional): Filter by 'rule' or 'solution'
- \`limit\` (optional): Maximum number of results (default: 20)

**Example:** Search for rules about "authentication" or "error handling"

### search-solutions
Search BitCompass solutions by query.

**When to use:** When you need to find solutions to specific problems.

**Parameters:**
- \`query\` (required): Search query string
- \`limit\` (optional): Maximum number of results (default: 20)

**Example:** Search for solutions about "database connection issues"

### post-rules
Publish a new rule, solution, skill, or command to BitCompass.

**When to use:** When you've created a reusable pattern, best practice, solution, skill, or command that should be shared.

**Parameters:**
- \`kind\` (required): 'rule', 'solution', 'skill', or 'command'
- \`title\` (required): Title
- \`body\` (required): Full content
- \`description\` (optional): Short description
- \`context\` (optional): Additional context
- \`examples\` (optional): Array of example strings
- \`technologies\` (optional): Array of technology tags

**Example:** After implementing a new pattern, publish it as a rule; skills and commands follow the same flow.

## CLI Commands (Run via Terminal)

Use these commands when you need to interact with BitCompass from the terminal:

### Authentication
- \`bitcompass login\` - Log in with Google (opens browser)
- \`bitcompass logout\` - Remove stored credentials
- \`bitcompass whoami\` - Show current user (email)

**When to use:** When authentication is required or to verify login status.

### Project Configuration
- \`bitcompass init\` - Configure project: editor/AI provider and output folder

**When to use:** Run once per project to set up BitCompass configuration.

### Rules Management
- \`bitcompass rules search [query]\` - Search rules interactively
- \`bitcompass rules list\` - List all available rules
- \`bitcompass rules pull [id]\` - Pull a rule by ID (saves to \`.cursor/rules\` as \`.mdc\`)
  - Use \`--global\` flag to install globally to ~/.cursor/rules/
- \`bitcompass rules push [file]\` - Push a rule file to BitCompass

**When to use:** \`pull\` to add a rule to the project; \`push\` to share; \`search\`/\`list\` to browse.

### Skills Management
- \`bitcompass skills list\` - List all skills
- \`bitcompass skills pull [id]\` - Pull a skill by ID (saves to \`.cursor/skills\` as \`.md\` with name/description frontmatter)
- \`bitcompass skills push [file]\` - Push a skill file to BitCompass

**When to use:** Same pattern as rules; skills go to \`.cursor/skills\` and match create-skill format.

### Commands Management
- \`bitcompass commands list\` - List all commands
- \`bitcompass commands pull [id]\` - Pull a command by ID (saves to \`.cursor/commands\` as plain \`.md\`, no frontmatter)
- \`bitcompass commands push [file]\` - Push a command file to BitCompass

**When to use:** Commands are saved as plain markdown in \`.cursor/commands\`.

### Solutions Management
- \`bitcompass solutions search [query]\` - Search solutions interactively
- \`bitcompass solutions list\` - List all solutions
- \`bitcompass solutions pull [id]\` - Pull a solution by ID (saves to \`.cursor/documentation\` as plain \`.md\`)
  - Use \`--global\` flag to install globally
- \`bitcompass solutions push [file]\` - Push a solution file to BitCompass

**When to use:** Solutions go to \`.cursor/documentation\` as plain markdown.

### Configuration
- \`bitcompass config list\` - List all config values
- \`bitcompass config get <key>\` - Get a specific config value
- \`bitcompass config set <key> <value>\` - Set config value (supabaseUrl, supabaseAnonKey, apiUrl)

**When to use:** When you need to check or modify BitCompass configuration.

### MCP Server
- \`bitcompass mcp start\` - Start MCP server (stdio mode for AI editors)
- \`bitcompass mcp status\` - Show MCP server status

**When to use:** Usually configured automatically by the AI editor. Use \`status\` to verify MCP is working.

## Decision Guide

**Use MCP tools when:**
- You're working in the AI editor and need to search or publish rules/solutions
- The user asks you to search for existing patterns or solutions
- You've created something reusable and want to share it immediately
- The user wants to log their activity

**Use CLI commands when:**
- You need to authenticate or verify authentication
- The user explicitly asks to run a CLI command
- You need to pull rules/solutions to the project (for version control)
- You need to check or modify configuration
- The MCP tool is not available or returns an authentication error

## Authentication Notes

- Most MCP tools require authentication (except search-rules and search-solutions)
- If you get an authentication error, instruct the user to run \`bitcompass login\` and restart the MCP server
- CLI commands that require auth will prompt the user to login

## Best Practices

1. **Search before creating:** Before publishing a new rule, search to see if something similar exists
2. **Use descriptive titles:** When posting rules/solutions, use clear, searchable titles
3. **Include context:** Add context, examples, and technologies when posting to make rules more discoverable
4. **Pull for version control:** Use \`rules pull\`, \`skills pull\`, \`commands pull\`, or \`solutions pull\` to add content to \`.cursor/rules\`, \`.cursor/skills\`, \`.cursor/commands\`, or \`.cursor/documentation\` (tracked in git)
5. **Global vs project:** Use \`--global\` flag when you want content available across all projects, otherwise use project-specific folders
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
  console.log(INDENT + chalk.bold('Editor:'), config.editor);
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
