import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, ExternalLink, Plus, Terminal } from 'lucide-react';
import { useState } from 'react';

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

const CURSOR_MCP_DOCS_URL = 'https://cursor.com/docs/context/mcp';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export default function MCPPage() {
  const [mcpCopied, setMcpCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyMcp = async () => {
    const ok = await copyToClipboard(MCP_CONFIG);
    if (ok) {
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleCopyMcpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void handleCopyMcp();
    }
  };

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
    // Copy MCP config to clipboard for Antigrativity setup
    const ok = await copyToClipboard(MCP_CONFIG);
    if (ok) {
      toast({ 
        title: 'MCP config copied', 
        description: 'Paste this into Antigrativity → Settings → MCP → Add Server' 
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="MCP Server"
        description="Use BitCompass in Cursor or Antigrativity via Model Context Protocol (MCP). Search rules, publish solutions, and create activity logs directly from your AI editor."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAddToCursor}
            onKeyDown={handleAddToCursorKeyDown}
            aria-label="Add BitCompass MCP to Cursor (opens Cursor)"
            tabIndex={0}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add to Cursor
          </button>
          <button
            type="button"
            onClick={handleAddToAntigrativity}
            onKeyDown={handleAddToAntigrativityKeyDown}
            aria-label="Add BitCompass MCP to Antigrativity"
            tabIndex={0}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
            }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            Add to Antigrativity
          </button>
        </div>
      </PageHeader>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What is MCP?</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-3">
              Model Context Protocol (MCP) allows AI editors like Cursor to interact with external tools and services. BitCompass provides an MCP server that gives your AI assistant access to rules, solutions, and activity logs.
            </p>
            <p className="text-sm text-muted-foreground">
              The MCP server reads the same project config as the CLI (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.bitcompass/config.json</code>). If the project is not initialized, a one-line warning is shown and defaults are used (Cursor / <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.cursor/rules</code>).
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Setup</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Add to Your Editor
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Paste this configuration into your editor's MCP settings. For Cursor: Settings → Features → MCP → Edit config (or <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">~/.cursor/mcp.json</code>). For Antigrativity: Settings → MCP → Add Server. Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">bitcompass login</code> first, then restart the MCP server if you added it before logging in.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                onClick={handleAddToCursor}
                onKeyDown={handleAddToCursorKeyDown}
                aria-label="Add BitCompass MCP to Cursor (opens Cursor)"
                tabIndex={0}
              >
                Add to Cursor
              </Button>
              <button
                type="button"
                onClick={handleAddToAntigrativity}
                onKeyDown={handleAddToAntigrativityKeyDown}
                aria-label="Add BitCompass MCP to Antigrativity"
                tabIndex={0}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
                }}
              >
                <Plus className="w-4 h-4 shrink-0" />
                Add to Antigrativity
              </button>
              <a
                href={CURSOR_MCP_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                MCP docs
              </a>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="relative rounded-lg border bg-muted/50 overflow-hidden">
              <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre">
                {MCP_CONFIG}
              </pre>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => void handleCopyMcp()}
                onKeyDown={handleCopyMcpKeyDown}
                aria-label={mcpCopied ? 'Copied' : 'Copy MCP config'}
                tabIndex={0}
              >
                {mcpCopied ? (
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {mcpCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">MCP Tools</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <strong className="text-foreground text-sm font-semibold">Rules & Solutions:</strong>
                <ul className="ml-4 mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">search-rules</code>
                    <span className="ml-2">Search rules by query</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">search-solutions</code>
                    <span className="ml-2">Search solutions by query</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">get-rule</code>
                    <span className="ml-2">Get full rule/solution by ID</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">list-rules</code>
                    <span className="ml-2">List all rules/solutions</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">post-rules</code>
                    <span className="ml-2">Create/publish rule or solution</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">update-rule</code>
                    <span className="ml-2">Update existing rule/solution</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">delete-rule</code>
                    <span className="ml-2">Delete rule/solution by ID</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pull-rule</code>
                    <span className="ml-2">Pull rule/solution to file</span>
                  </li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground text-sm font-semibold">Activity Logs:</strong>
                <ul className="ml-4 mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">create-activity-log</code>
                    <span className="ml-2">Create from git repo</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">list-activity-logs</code>
                    <span className="ml-2">List user's activity logs</span>
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">get-activity-log</code>
                    <span className="ml-2">Get activity log by ID</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Authentication</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Most MCP tools require authentication (except <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">search-rules</code> and <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">search-solutions</code>).
            </p>
            <p className="text-sm text-muted-foreground">
              If you get an authentication error, run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">bitcompass login</code> in your terminal and restart the MCP server in Cursor.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">CLI Commands</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              You can also manage the MCP server from the command line:
            </p>
            <ul className="space-y-2 text-sm font-mono text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass mcp start</code>
                <span className="ml-2 text-sm font-normal">Start MCP server (stdio mode for AI editors)</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass mcp status</code>
                <span className="ml-2 text-sm font-normal">Show MCP server status</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              Usually configured automatically by the AI editor. Use <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">status</code> to verify MCP is working.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
