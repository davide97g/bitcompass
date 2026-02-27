import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CodeBlockWithCopyProps {
  code: string;
  className?: string;
  ariaLabel?: string;
}

/** Constrained width so copy CTA is easy to find; aligned with CommandBlock (min wide enough to not feel short) */
const CODE_BLOCK_WIDTH = 'w-fit min-w-[32rem] max-w-2xl';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export function CodeBlockWithCopy({ code, className, ariaLabel = 'Copy to clipboard' }: CodeBlockWithCopyProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard' });
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void handleCopy();
    }
  };

  return (
    <div
      className={cn(CODE_BLOCK_WIDTH, 'relative rounded-lg border border-border bg-muted/50 overflow-hidden', className)}
    >
      <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre">
        {code}
      </pre>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="absolute top-2 right-2"
        onClick={() => void handleCopy()}
        onKeyDown={handleKeyDown}
        aria-label={copied ? 'Copied' : ariaLabel}
        tabIndex={0}
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600 mr-2" />
        ) : (
          <Copy className="w-4 h-4 mr-2" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
