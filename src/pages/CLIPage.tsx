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
      "args": ["mcp", "start"],
      "env": {
        "BITCOMPASS_CONFIG_DIR": "~/.bitcompass"
      }
    }
  }
}`;

/** Base64-encoded BitCompass stdio config for Cursor MCP install deeplink */
const MCP_INSTALL_CONFIG_BASE64 =
  'eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoiYml0Y29tcGFzcyIsImFyZ3MiOlsibWNwIiwic3RhcnQiXSwiZW52Ijp7IkJJVENPTVBBU1NfQ09ORklHX0RJUiI6In4vLmJpdGNvbXBhc3MifX0=';

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

export default function CLIPage() {
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="CLI & MCP"
        description="Install and use the BitCompass CLI and add it to Cursor."
      >
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
      </PageHeader>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Install</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-3">
              Install globally from npm (or use <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">npx bitcompass</code> to run without installing).
            </p>
            <pre className="rounded-lg border bg-muted/50 p-4 text-sm font-mono overflow-x-auto">
              npm install -g bitcompass
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              Package: <a href="https://www.npmjs.com/package/bitcompass" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">npmjs.com/package/bitcompass</a>
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Configure</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-3">
              Point the CLI at your Supabase project (same as this web app).
            </p>
            <pre className="rounded-lg border bg-muted/50 p-4 text-sm font-mono overflow-x-auto whitespace-pre">
{`bitcompass config set supabaseUrl https://YOUR_PROJECT.supabase.co
bitcompass config set supabaseAnonKey YOUR_ANON_KEY`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              Or set env vars: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">BITCOMPASS_SUPABASE_URL</code>, <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">BITCOMPASS_SUPABASE_ANON_KEY</code>.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Login</h2>
        <Card>
          <CardContent className="pt-6">
            <pre className="rounded-lg border bg-muted/50 p-4 text-sm font-mono">
              bitcompass login
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              Opens the browser for Google sign-in. Then run <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">bitcompass whoami</code> to confirm.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Commands</h2>
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-2 text-sm font-mono text-muted-foreground">
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules search [query]</code> — Search rules</li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules list</code> — List rules</li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules pull [id]</code> — Pull rule to file</li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass rules push [file]</code> — Push rule</li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass solutions search|pull|push</code> — Same for solutions</li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass mcp start</code> — Start MCP server (stdio)</li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass mcp status</code> — Show MCP login status</li>
              <li><code className="rounded bg-muted px-1.5 py-0.5 text-foreground">bitcompass config list|set|get</code> — Config</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Use in Cursor (MCP)</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Add to Cursor
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Use BitCompass in Cursor. Paste this into Cursor → Settings → Features → MCP → Edit config (or <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">~/.cursor/mcp.json</code>). Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">bitcompass login</code> first. Replace <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">~</code> with your home path if your environment doesn’t expand it.
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
          <CardContent className="pt-0">
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
    </div>
  );
}
