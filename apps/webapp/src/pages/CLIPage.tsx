import { CodeBlockWithCopy } from '@/components/ui/code-block-with-copy';
import { PageHeader } from '@/components/ui/page-header';
import { Fragment } from 'react';

const COMMAND_GROUPS: { label: string; commands: [string, string][] }[] = [
  {
    label: 'Project setup',
    commands: [
      ['bitcompass init', 'Configure project (editor + output folder)'],
      ['bitcompass migrate', 'Migrate files from older versions to current layout'],
      ['bitcompass migrate --dry-run', 'Preview migration without changing files'],
    ],
  },
  {
    label: 'Authentication',
    commands: [
      ['bitcompass login', 'Sign in with Google'],
      ['bitcompass logout', 'Sign out'],
      ['bitcompass whoami', 'Show current user'],
    ],
  },
  {
    label: 'Rules',
    commands: [
      ['bitcompass rules search [query]', 'Search rules'],
      ['bitcompass rules list', 'List all rules'],
      ['bitcompass rules pull [id]', 'Pull rule into project'],
      ['bitcompass rules push [file]', 'Push rule to server'],
    ],
  },
  {
    label: 'Docs',
    commands: [
      ['bitcompass docs search [query]', 'Search documentation'],
      ['bitcompass docs list', 'List all documentation'],
      ['bitcompass docs pull [id]', 'Pull documentation into project'],
      ['bitcompass docs push [file]', 'Push documentation to server'],
    ],
  },
  {
    label: 'Skills',
    commands: [
      ['bitcompass skills search [query]', 'Search skills'],
      ['bitcompass skills list', 'List all skills'],
      ['bitcompass skills pull [id]', 'Pull skill into project'],
      ['bitcompass skills push [file]', 'Push skill to server'],
    ],
  },
  {
    label: 'Commands',
    commands: [
      ['bitcompass commands search [query]', 'Search commands'],
      ['bitcompass commands list', 'List all commands'],
      ['bitcompass commands pull [id]', 'Pull command into project'],
      ['bitcompass commands push [file]', 'Push command to server'],
    ],
  },
  {
    label: 'Share',
    commands: [
      ['bitcompass share [file]', 'Share a rule, documentation, skill, or command'],
      ['bitcompass share [file] --kind [rule|documentation|skill|command]', 'Share with explicit type'],
    ],
  },
  {
    label: 'Update',
    commands: [
      ['bitcompass update', 'Check for and apply updates to installed items'],
      ['bitcompass update --check', 'List available updates without applying'],
      ['bitcompass update --all -y', 'Update all items without prompting'],
    ],
  },
  {
    label: 'Sync',
    commands: [
      ['bitcompass sync', 'Sync local items with the linked Compass project'],
      ['bitcompass sync --check', 'Show sync status without applying changes'],
      ['bitcompass sync --prune', 'Sync and remove items no longer in the project'],
    ],
  },
  {
    label: 'Compass project',
    commands: [
      ['bitcompass project pull', 'Pull all items from the linked Compass project'],
      ['bitcompass project sync', 'Sync items with the linked Compass project'],
      ['bitcompass project list', 'Show the Compass project for this folder'],
    ],
  },
  {
    label: 'Groups',
    commands: [
      ['bitcompass group pull [id]', 'Pull all rules in a knowledge group'],
      ['bitcompass group sync [id]', 'Sync local rules with a group'],
      ['bitcompass group list', 'List available groups'],
    ],
  },
  {
    label: 'Configuration',
    commands: [
      ['bitcompass config list', 'List all config values'],
      ['bitcompass config get [key]', 'Get a config value'],
      ['bitcompass config set [key] [value]', 'Set a config value'],
      ['bitcompass config push', 'Push local config to the linked Compass project'],
      ['bitcompass config pull', 'Pull shared config from the linked Compass project'],
    ],
  },
  {
    label: 'MCP Server',
    commands: [
      ['bitcompass mcp start', 'Start MCP server (stdio)'],
      ['bitcompass mcp status', 'Show MCP server status'],
    ],
  },
  {
    label: 'Other',
    commands: [
      ['bitcompass glossary', 'Show glossary (rules, docs, skills, commands)'],
      ['bitcompass self-update', 'Update BitCompass CLI to the latest version'],
    ],
  },
];

export default function CLIPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="CLI"
        description="Install the BitCompass CLI to manage rules, documentation, and skills from the terminal."
      />

      {/* Quick start */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick start</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground dark:text-zinc-500 mb-1.5">1. Install</p>
            <CodeBlockWithCopy code="npm install -g bitcompass" ariaLabel="Copy install command" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground dark:text-zinc-500 mb-1.5">2. Login</p>
            <CodeBlockWithCopy code="bitcompass login" ariaLabel="Copy login command" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground dark:text-zinc-500 mb-1.5">3. Initialize your project</p>
            <CodeBlockWithCopy code="bitcompass init" ariaLabel="Copy init command" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground dark:text-zinc-500">
          <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">init</code> sets your editor and output folder for rules. Config is saved in <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">.bitcompass/config.json</code>. Package: <a href="https://www.npmjs.com/package/bitcompass" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">npmjs.com/package/bitcompass</a>
        </p>
      </section>

      {/* Commands reference */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Commands</h2>
        <div className="overflow-hidden rounded-lg border border-border dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border dark:border-white/10 bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground dark:text-zinc-400">Command</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground dark:text-zinc-400">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/10">
              {COMMAND_GROUPS.map((group) => (
                <Fragment key={group.label}>
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-500 bg-muted/30"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.commands.map(([cmd, desc]) => (
                    <tr key={cmd}>
                      <td className="px-4 py-2 font-mono text-xs text-foreground whitespace-nowrap">{cmd}</td>
                      <td className="px-4 py-2 text-muted-foreground dark:text-zinc-400">{desc}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MCP link */}
      <p className="text-sm text-muted-foreground dark:text-zinc-400">
        BitCompass also provides an MCP server for AI editors. See <a href="/mcp" className="text-primary underline hover:no-underline">MCP setup</a> for details.
      </p>
    </div>
  );
}
