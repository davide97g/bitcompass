import { Button } from '@/components/ui/button';
import { CodeBlockWithCopy } from '@/components/ui/code-block-with-copy';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

const MCP_CONFIG = `{
  "mcpServers": {
    "bitcompass": {
      "type": "stdio",
      "command": "bitcompass",
      "args": ["mcp", "start"]
    }
  }
}`;

/** Base64-encoded BitCompass stdio config for Cursor MCP install deeplink (no env) */
const MCP_INSTALL_CONFIG_BASE64 =
  'eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoiYml0Y29tcGFzcyIsImFyZ3MiOlsibWNwIiwic3RhcnQiXX0=';

const ADD_TO_CURSOR_DEEPLINK = `cursor://anysphere.cursor-deeplink/mcp/install?name=bitcompass&config=${encodeURIComponent(MCP_INSTALL_CONFIG_BASE64)}`;

const CLAUDE_CODE_COMMAND = 'claude mcp add bitcompass -- bitcompass mcp start';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export default function MCPPage() {
  const { toast } = useToast();

  const handleAddToCursor = () => {
    window.location.href = ADD_TO_CURSOR_DEEPLINK;
  };

  const handleAddToCursorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAddToCursor();
    }
  };

  const handleAddToAntigrativity = async () => {
    const ok = await copyToClipboard(MCP_CONFIG);
    if (ok) {
      toast({
        title: 'MCP config copied',
        description: 'Paste this into Antigrativity → Settings → MCP → Add Server',
      });
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleAddToAntigrativityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void handleAddToAntigrativity();
    }
  };

  const handleAddToClaude = async () => {
    const ok = await copyToClipboard(CLAUDE_CODE_COMMAND);
    if (ok) {
      toast({
        title: 'Claude command copied',
        description: 'Paste and run in your terminal to add BitCompass MCP to Claude Code',
      });
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleAddToClaudeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void handleAddToClaude();
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="MCP Server"
        description="Use BitCompass in Cursor, Claude, or Antigrativity via Model Context Protocol (MCP). Search rules and publish solutions directly from your AI editor."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleAddToCursor}
            onKeyDown={handleAddToCursorKeyDown}
            aria-label="Add BitCompass MCP to Cursor (opens Cursor)"
            tabIndex={0}
            className="gap-2"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add to Cursor
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleAddToClaude()}
            onKeyDown={handleAddToClaudeKeyDown}
            aria-label="Add BitCompass MCP to Claude"
            tabIndex={0}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white border-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add to Claude
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleAddToAntigrativity()}
            onKeyDown={handleAddToAntigrativityKeyDown}
            aria-label="Add BitCompass MCP to Antigrativity"
            tabIndex={0}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add to Antigrativity
          </Button>
        </div>
      </PageHeader>

      {/* Setup */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Setup</h2>
        <p className="text-sm text-muted-foreground dark:text-zinc-400">
          Paste this configuration into your editor's MCP settings, or use the buttons above for one-click setup.
        </p>
        <CodeBlockWithCopy code={MCP_CONFIG} ariaLabel="Copy MCP config" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground dark:text-zinc-500">Cursor</dt>
          <dd className="text-muted-foreground dark:text-zinc-400">Settings → Features → MCP → Edit config, or <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">~/.cursor/mcp.json</code></dd>
          <dt className="text-muted-foreground dark:text-zinc-500">Claude Desktop</dt>
          <dd className="text-muted-foreground dark:text-zinc-400"><code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">~/Library/Application Support/Claude/claude_desktop_config.json</code></dd>
          <dt className="text-muted-foreground dark:text-zinc-500">Claude Code</dt>
          <dd className="text-muted-foreground dark:text-zinc-400"><code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">claude mcp add bitcompass -- bitcompass mcp start</code></dd>
          <dt className="text-muted-foreground dark:text-zinc-500">Antigrativity</dt>
          <dd className="text-muted-foreground dark:text-zinc-400">Settings → MCP → Add Server</dd>
        </dl>
        <p className="text-xs text-muted-foreground dark:text-zinc-500">
          Run <code className="rounded bg-muted dark:bg-white/10 px-1 py-0.5 font-mono text-xs">bitcompass login</code> first, then restart the MCP server if you added it before logging in.
        </p>
      </section>

      {/* Available tools */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Available tools</h2>
        <div className="overflow-hidden rounded-lg border border-border dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border dark:border-white/10 bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground dark:text-zinc-400">Tool</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground dark:text-zinc-400">Description</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground dark:text-zinc-400">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/10">
              {[
                ['search-rules', 'Search rules, solutions, skills, or commands by query', 'No'],
                ['search-solutions', 'Search solutions by query', 'No'],
                ['get-rule', 'Get full content of any item by ID', 'Yes'],
                ['list-rules', 'List all rules, solutions, skills, or commands', 'Yes'],
                ['post-rules', 'Publish a rule, solution, skill, or command', 'Yes'],
                ['update-rule', 'Update an existing item', 'Yes'],
                ['delete-rule', 'Delete an item by ID', 'Yes'],
                ['pull-rule', 'Pull any item to a local file', 'Yes'],
                ['pull-group', 'Pull all items in a knowledge group', 'Yes'],
              ].map(([tool, desc, auth]) => (
                <tr key={tool}>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{tool}</td>
                  <td className="px-4 py-2.5 text-muted-foreground dark:text-zinc-400">{desc}</td>
                  <td className="px-4 py-2.5 text-muted-foreground dark:text-zinc-400">{auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLI */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">CLI commands</h2>
        <p className="text-sm text-muted-foreground dark:text-zinc-400">
          Manage the MCP server from the terminal. Usually configured automatically by the editor.
        </p>
        <div className="space-y-1.5 text-sm font-mono">
          <div className="flex items-baseline gap-3">
            <code className="text-foreground">bitcompass mcp start</code>
            <span className="font-sans text-muted-foreground dark:text-zinc-500">Start server (stdio)</span>
          </div>
          <div className="flex items-baseline gap-3">
            <code className="text-foreground">bitcompass mcp status</code>
            <span className="font-sans text-muted-foreground dark:text-zinc-500">Check server status</span>
          </div>
        </div>
      </section>
    </div>
  );
}
