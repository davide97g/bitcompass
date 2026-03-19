import type { TuiCommandGroup } from './types.js';

export const commandGroups: TuiCommandGroup[] = [
  {
    label: '⚡ KNOWLEDGE',
    commands: [
      {
        label: 'rules search [query]',
        description: 'Search for rules in the BitCompass registry',
        baseArgv: ['rules', 'search'],
        args: [{ name: 'query', required: false, placeholder: 'search term' }],
        options: [{ flags: '--list', type: 'boolean', description: 'List results only; do not prompt to select' }],
      },
      {
        label: 'rules list',
        description: 'List all available rules',
        baseArgv: ['rules', 'list'],
        options: [{ flags: '--table', type: 'boolean', description: 'Show output in aligned columns' }],
      },
      {
        label: 'rules pull [id]',
        description: 'Pull a rule by ID or choose from list (creates symbolic link by default)',
        baseArgv: ['rules', 'pull'],
        args: [{ name: 'id', required: false, placeholder: 'rule-id' }],
        options: [
          { flags: '--global', type: 'boolean', description: 'Install globally to ~/.cursor/rules/' },
          { flags: '--copy', type: 'boolean', description: 'Copy file instead of creating symbolic link' },
        ],
      },
      {
        label: 'rules push [file]',
        description: 'Push a rule to the registry (file or interactive)',
        baseArgv: ['rules', 'push'],
        args: [{ name: 'file', required: false, placeholder: './my-rule.mdc' }],
        options: [{ flags: '--project-id <id>', type: 'string', placeholder: 'uuid', description: 'Scope to Compass project' }],
      },
      {
        label: 'docs search [query]',
        description: 'Search for docs in the BitCompass registry',
        baseArgv: ['docs', 'search'],
        args: [{ name: 'query', required: false, placeholder: 'search term' }],
        options: [{ flags: '--list', type: 'boolean', description: 'List results only; do not prompt to select' }],
      },
      {
        label: 'docs list',
        description: 'List all available docs',
        baseArgv: ['docs', 'list'],
        options: [{ flags: '--table', type: 'boolean', description: 'Show output in aligned columns' }],
      },
      {
        label: 'docs pull [id]',
        description: 'Pull a doc by ID or choose from list',
        baseArgv: ['docs', 'pull'],
        args: [{ name: 'id', required: false, placeholder: 'doc-id' }],
        options: [
          { flags: '--global', type: 'boolean', description: 'Install globally' },
          { flags: '--copy', type: 'boolean', description: 'Copy file instead of symbolic link' },
        ],
      },
      {
        label: 'docs push [file]',
        description: 'Push a doc to the registry',
        baseArgv: ['docs', 'push'],
        args: [{ name: 'file', required: false, placeholder: './my-doc.md' }],
        options: [{ flags: '--project-id <id>', type: 'string', placeholder: 'uuid', description: 'Scope to Compass project' }],
      },
      {
        label: 'skills search [query]',
        description: 'Search for skills in the BitCompass registry',
        baseArgv: ['skills', 'search'],
        args: [{ name: 'query', required: false, placeholder: 'search term' }],
        options: [{ flags: '--list', type: 'boolean', description: 'List results only; do not prompt to select' }],
      },
      {
        label: 'skills list',
        description: 'List all available skills',
        baseArgv: ['skills', 'list'],
        options: [{ flags: '--table', type: 'boolean', description: 'Show output in aligned columns' }],
      },
      {
        label: 'skills pull [id]',
        description: 'Pull a skill by ID or choose from list',
        baseArgv: ['skills', 'pull'],
        args: [{ name: 'id', required: false, placeholder: 'skill-id' }],
        options: [
          { flags: '--global', type: 'boolean', description: 'Install globally' },
          { flags: '--copy', type: 'boolean', description: 'Copy file instead of symbolic link' },
        ],
      },
      {
        label: 'skills push [file]',
        description: 'Push a skill to the registry',
        baseArgv: ['skills', 'push'],
        args: [{ name: 'file', required: false, placeholder: './my-skill.md' }],
        options: [{ flags: '--project-id <id>', type: 'string', placeholder: 'uuid', description: 'Scope to Compass project' }],
      },
      {
        label: 'commands search [query]',
        description: 'Search for commands in the BitCompass registry',
        baseArgv: ['commands', 'search'],
        args: [{ name: 'query', required: false, placeholder: 'search term' }],
        options: [{ flags: '--list', type: 'boolean', description: 'List results only; do not prompt to select' }],
      },
      {
        label: 'commands list',
        description: 'List all available commands',
        baseArgv: ['commands', 'list'],
        options: [{ flags: '--table', type: 'boolean', description: 'Show output in aligned columns' }],
      },
      {
        label: 'commands pull [id]',
        description: 'Pull a command by ID or choose from list',
        baseArgv: ['commands', 'pull'],
        args: [{ name: 'id', required: false, placeholder: 'command-id' }],
        options: [
          { flags: '--global', type: 'boolean', description: 'Install globally' },
          { flags: '--copy', type: 'boolean', description: 'Copy file instead of symbolic link' },
        ],
      },
      {
        label: 'commands push [file]',
        description: 'Push a command to the registry',
        baseArgv: ['commands', 'push'],
        args: [{ name: 'file', required: false, placeholder: './my-command.md' }],
        options: [{ flags: '--project-id <id>', type: 'string', placeholder: 'uuid', description: 'Scope to Compass project' }],
      },
    ],
  },
  {
    label: '🔄 SYNC & UPDATE',
    commands: [
      {
        label: 'sync',
        description: 'Sync local rules/skills/commands/docs with the linked Compass project',
        baseArgv: ['sync'],
        options: [
          { flags: '--check', type: 'boolean', description: 'Show sync status only; do not apply changes' },
          { flags: '--all', type: 'boolean', description: 'Sync all items without interactive selection' },
          { flags: '--yes', type: 'boolean', description: 'Skip confirmation prompt' },
          { flags: '--prune', type: 'boolean', description: 'Also remove local items no longer in the project' },
          { flags: '--global', type: 'boolean', description: 'Operate on global installs' },
        ],
      },
      {
        label: 'update',
        description: 'Check for and apply updates to installed rules, skills, commands, and docs',
        baseArgv: ['update'],
        options: [
          { flags: '--check', type: 'boolean', description: 'List available updates only; do not apply' },
          { flags: '--all', type: 'boolean', description: 'Select all updatable items' },
          { flags: '--yes', type: 'boolean', description: 'Apply updates without confirmation' },
          { flags: '--global', type: 'boolean', description: 'Operate on global installs' },
          { flags: '--kind <kind>', type: 'string', placeholder: 'rule|skill|command|documentation', description: 'Limit to one kind' },
        ],
      },
      {
        label: 'project pull',
        description: 'Pull selected (or all) rules, skills, commands, and docs from the Compass project',
        baseArgv: ['project', 'pull'],
        options: [
          { flags: '--global', type: 'boolean', description: 'Install globally' },
          { flags: '--copy', type: 'boolean', description: 'Copy files instead of symbolic links' },
          { flags: '--all', type: 'boolean', description: 'Pull all items without prompting' },
        ],
      },
      {
        label: 'project sync',
        description: 'Sync local rules/skills/commands/docs with the configured Compass project',
        baseArgv: ['project', 'sync'],
        options: [
          { flags: '--prune', type: 'boolean', description: 'Remove local files no longer in the project' },
          { flags: '--global', type: 'boolean', description: 'Operate on global installs' },
        ],
      },
      {
        label: 'group pull <id>',
        description: 'Pull all rules in a group (and sub-groups)',
        baseArgv: ['group', 'pull'],
        args: [{ name: 'id', required: true, placeholder: 'group-id' }],
        options: [
          { flags: '--global', type: 'boolean', description: 'Install globally' },
          { flags: '--copy', type: 'boolean', description: 'Copy files instead of symbolic links' },
          { flags: '--all', type: 'boolean', description: 'Pull all items without prompting' },
        ],
      },
      {
        label: 'group sync <id>',
        description: 'Sync local rules with a group (pull new, optionally prune)',
        baseArgv: ['group', 'sync'],
        args: [{ name: 'id', required: true, placeholder: 'group-id' }],
        options: [
          { flags: '--prune', type: 'boolean', description: 'Remove local files no longer in the group' },
          { flags: '--global', type: 'boolean', description: 'Operate on global installs' },
        ],
      },
      {
        label: 'share [file]',
        description: 'Share a rule, doc, skill, or command (prompts for type if not in file or --kind)',
        baseArgv: ['share'],
        args: [{ name: 'file', required: false, placeholder: './my-file.mdc' }],
        options: [
          { flags: '--kind <kind>', type: 'string', placeholder: 'rule|documentation|skill|command', description: 'Type: rule, documentation, skill, or command' },
          { flags: '--project-id <id>', type: 'string', placeholder: 'uuid', description: 'Scope to Compass project' },
        ],
      },
    ],
  },
  {
    label: '⚙ SETUP',
    commands: [
      {
        label: 'init',
        description: 'Configure project: editor/AI provider and output folder for rules/docs/commands',
        baseArgv: ['init'],
      },
      {
        label: 'config',
        description: 'Open configuration TUI (project link, default sharing, version)',
        baseArgv: ['config'],
        hideGlobalOptions: true,
      },
      {
        label: 'glossary',
        description: 'Show glossary (rules, docs, skills, commands)',
        baseArgv: ['glossary'],
      },
    ],
  },
  {
    label: '🔗 INTEGRATIONS',
    commands: [
      {
        label: 'login',
        description: 'Log in with Google (opens browser)',
        baseArgv: ['login'],
        hideGlobalOptions: true,
      },
      {
        label: 'logout',
        description: 'Remove stored credentials',
        baseArgv: ['logout'],
        hideGlobalOptions: true,
      },
      {
        label: 'whoami',
        description: 'Show current user (email)',
        baseArgv: ['whoami'],
        hideGlobalOptions: true,
      },
      {
        label: 'self-update',
        description: 'Update BitCompass CLI to the latest version',
        baseArgv: ['self-update'],
        hideGlobalOptions: true,
      },
      {
        label: 'mcp',
        description: 'MCP server setup info and available tools',
        baseArgv: ['mcp', 'status'],
        hideGlobalOptions: true,
        inlineView: 'McpInline',
      },
    ],
  },
];

/** Flat list of all commands with their group index for navigation */
export interface FlatCommand {
  command: import('./types.js').TuiCommand;
  groupIndex: number;
  commandIndex: number;
}

export function flattenCommands(): FlatCommand[] {
  const result: FlatCommand[] = [];
  commandGroups.forEach((group, gi) => {
    group.commands.forEach((cmd, ci) => {
      result.push({ command: cmd, groupIndex: gi, commandIndex: ci });
    });
  });
  return result;
}
