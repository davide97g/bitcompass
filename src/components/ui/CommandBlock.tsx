import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CommandBlockProps {
  commands: string[];
  className?: string;
}

/** Constrained width so copy CTA is easy to find; consistent across app (min wide enough to not feel short) */
const COMMAND_BLOCK_WIDTH = 'w-fit min-w-[32rem] max-w-2xl';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export function CommandBlock({ commands, className }: CommandBlockProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (command: string, index: number) => {
    const ok = await copyToClipboard(command);
    if (ok) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, command: string, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCopy(command, index);
    }
  };

  return (
    <div className={cn(COMMAND_BLOCK_WIDTH, 'rounded-lg border border-border bg-muted/50 overflow-hidden', className)}>
      <div className="px-3 py-2 border-b border-border bg-muted/80 text-xs font-medium text-muted-foreground">
        Run in your terminal
      </div>
      <ul className="divide-y divide-border">
        {commands.map((cmd, index) => (
          <li key={`${index}-${cmd}`} className="flex items-center gap-2 group">
            <pre className="flex-1 overflow-x-auto p-3 text-sm font-mono whitespace-pre">
              <code>{cmd}</code>
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 opacity-70 group-hover:opacity-100"
              onClick={() => handleCopy(cmd, index)}
              onKeyDown={(e) => handleKeyDown(e, cmd, index)}
              aria-label={copiedIndex === index ? 'Copied' : 'Copy command'}
              tabIndex={0}
            >
              {copiedIndex === index ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
