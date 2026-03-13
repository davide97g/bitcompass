import { CodeBlockWithCopy } from '@/components/ui/code-block-with-copy';
import { PageHeader } from '@/components/ui/page-header';

const COMMAND_GROUPS: { label: string; commands: [string, string][] }[] = [
  {
    label: 'Project setup',
    commands: [
      ['bitcompass init', 'Configure project (editor + output folder)'],
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
    label: 'Solutions',
    commands: [
      ['bitcompass solutions search [query]', 'Search solutions'],
      ['bitcompass solutions list', 'List all solutions'],
      ['bitcompass solutions pull [id]', 'Pull solution into project'],
      ['bitcompass solutions push [file]', 'Push solution to server'],
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
    label: 'Configuration',
    commands: [
      ['bitcompass config list', 'List all config values'],
      ['bitcompass config get [key]', 'Get a config value'],
      ['bitcompass config set [key] [value]', 'Set a config value'],
    ],
  },
  {
    label: 'MCP Server',
    commands: [
      ['bitcompass mcp start', 'Start MCP server (stdio)'],
      ['bitcompass mcp status', 'Show MCP server status'],
    ],
  },
];

export default function CLIPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="CLI"
        description="Install the BitCompass CLI to manage rules, solutions, and skills from the terminal."
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
                <>
                  <tr key={group.label}>
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
                </>
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
