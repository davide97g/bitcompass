import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const MAX_RAW_LINES = 12;

interface JsonPreviewProps {
  raw: string;
  className?: string;
  defaultOpen?: boolean;
}

export function JsonPreview({ raw, className, defaultOpen = false }: JsonPreviewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const lines = raw.trim().split('\n');
  const truncated = lines.length > MAX_RAW_LINES;
  const displayLines = truncated ? lines.slice(0, MAX_RAW_LINES) : lines;

  let parseError: string | null = null;
  try {
    JSON.parse(raw);
  } catch (e) {
    parseError = e instanceof Error ? e.message : 'Invalid JSON';
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('rounded-lg border bg-muted/30', className)}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 transition-colors rounded-t-lg"
        aria-label={open ? 'Collapse JSON preview' : 'Expand JSON preview'}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" />
        )}
        <span>Raw JSON preview</span>
        {truncated && !open && (
          <span className="text-xs text-muted-foreground ml-1">
            ({lines.length} lines)
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-3 py-2">
          {parseError ? (
            <p className="text-sm text-destructive">{parseError}</p>
          ) : (
            <pre className="text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre break-all">
              {displayLines.join('\n')}
              {truncated && '\n…'}
            </pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
