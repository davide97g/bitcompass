import { Card, CardContent } from '@/components/ui/card';
import { CodeBlockWithCopy } from '@/components/ui/code-block-with-copy';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { Terminal } from 'lucide-react';

const CARD_RECAP = 'border-border dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-sm';
const CARD_CONTENT = 'border-border dark:border-white/10';

export default function CLIPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CLI"
        description="Install the BitCompass CLI, run init to set editor and output folder, then use rules, solutions, and activity logs from the terminal."
      />

      {/* ReCAP: main actions always visible at top */}
      <Card className={cn('border-l-4 dark:border-l-4 dark:border-l-amber-500/40', CARD_RECAP)}>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <Terminal className="h-4 w-4" aria-hidden />
            Quick start
          </p>
          <p className="text-xs text-muted-foreground dark:text-zinc-400">
            Install globally, then run <code className="rounded bg-muted dark:bg-white/10 px-1.5 py-0.5 font-mono text-xs">bitcompass init</code> once per project to set your editor and output folder. Copy the commands below.
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground dark:text-zinc-400 mb-1">Install</p>
              <CodeBlockWithCopy code="npm install -g bitcompass" ariaLabel="Copy install command" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground dark:text-zinc-400 mb-1">Initialize project (recommended)</p>
              <CodeBlockWithCopy code="bitcompass init" ariaLabel="Copy init command" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground dark:text-zinc-400">
            Package: <a href="https://www.npmjs.com/package/bitcompass" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">npmjs.com/package/bitcompass</a>
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Login</h2>
        <Card className={CARD_CONTENT}>
          <CardContent className="pt-6">
            <CodeBlockWithCopy code="bitcompass login" ariaLabel="Copy login command" />
            <p className="text-sm text-muted-foreground dark:text-zinc-400 mt-2">
              Opens the browser for Google sign-in. Then run <code className="rounded bg-muted dark:bg-white/10 px-1.5 py-0.5 font-mono text-sm">bitcompass whoami</code> to confirm.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Project setup (details)</h2>
        <Card className={CARD_CONTENT}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground dark:text-zinc-400">
              Run <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">bitcompass init</code> once per project. You choose your <strong>editor / AI provider</strong> (VSCode, Cursor, Antigrativity, Claude Code) and the <strong>output folder</strong> for rules, docs, and commands. Defaults by editor (e.g. Cursor → <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">.cursor/rules</code>). Config is saved in <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">.bitcompass/config.json</code> and <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">.bitcompass</code> is added to <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">.gitignore</code>. If you skip init, the CLI and MCP use defaults.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Commands</h2>
        <Card className={CARD_CONTENT}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Project Setup:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass init</code>
                    <span className="ml-2 text-sm font-normal">Configure project (editor + output folder for rules/docs)</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Authentication:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass login</code>
                    <span className="ml-2 text-sm font-normal">Authenticate with Google sign-in</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass logout</code>
                    <span className="ml-2 text-sm font-normal">Sign out</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass whoami</code>
                    <span className="ml-2 text-sm font-normal">Show current user</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Rules:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules search [query]</code>
                    <span className="ml-2 text-sm font-normal">Search rules</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules list</code>
                    <span className="ml-2 text-sm font-normal">List all rules</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules pull [id]</code>
                    <span className="ml-2 text-sm font-normal">Pull rule into project output folder</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules push [file]</code>
                    <span className="ml-2 text-sm font-normal">Push rule to server</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Solutions:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass solutions search [query]</code>
                    <span className="ml-2 text-sm font-normal">Search solutions</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass solutions list</code>
                    <span className="ml-2 text-sm font-normal">List all solutions</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass solutions pull [id]</code>
                    <span className="ml-2 text-sm font-normal">Pull solution into project output folder</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass solutions push [file]</code>
                    <span className="ml-2 text-sm font-normal">Push solution to server</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Skills:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass skills search [query]</code>
                    <span className="ml-2 text-sm font-normal">Search skills</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass skills list</code>
                    <span className="ml-2 text-sm font-normal">List all skills</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass skills pull [id]</code>
                    <span className="ml-2 text-sm font-normal">Pull skill into project output folder</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass skills push [file]</code>
                    <span className="ml-2 text-sm font-normal">Push skill to server</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Commands:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass commands search [query]</code>
                    <span className="ml-2 text-sm font-normal">Search commands</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass commands list</code>
                    <span className="ml-2 text-sm font-normal">List all commands</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass commands pull [id]</code>
                    <span className="ml-2 text-sm font-normal">Pull command into project output folder</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass commands push [file]</code>
                    <span className="ml-2 text-sm font-normal">Push command to server</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Activity Logs:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass log [day]</code>
                    <span className="ml-2 text-sm font-normal">Push activity log for a specific day (YYYY-MM-DD)</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass log [start] [end]</code>
                    <span className="ml-2 text-sm font-normal">Push activity log for a date range</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold mb-2 block">Configuration:</strong>
                <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass config list</code>
                    <span className="ml-2 text-sm font-normal">List all config values</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass config get [key]</code>
                    <span className="ml-2 text-sm font-normal">Get a specific config value</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass config set [key] [value]</code>
                    <span className="ml-2 text-sm font-normal">Set config value (supabaseUrl, supabaseAnonKey, apiUrl)</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">MCP Server</h2>
        <Card className={CARD_CONTENT}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-3">
              BitCompass also provides an MCP server for use in AI editors like Cursor. See the <a href="/mcp" className="text-primary underline hover:no-underline">MCP documentation</a> for setup instructions.
            </p>
            <CodeBlockWithCopy
              code={`bitcompass mcp start\nbitcompass mcp status`}
              ariaLabel="Copy MCP commands"
            />
            <ul className="space-y-2 text-sm font-mono text-muted-foreground dark:text-zinc-400 mt-3">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass mcp start</code>
                <span className="ml-2 text-sm font-normal">Start MCP server (stdio mode for AI editors)</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass mcp status</code>
                <span className="ml-2 text-sm font-normal">Show MCP server status</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
