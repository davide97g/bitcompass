import { cn } from '@/lib/utils';
import { FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { CodeBlockWithCopy } from '@/components/ui/code-block-with-copy';
import { getTechStyle } from '@/lib/tech-styles';
import { KIND_COLORS } from './file-tree-constants';
import { FileTreeEmptyState } from './FileTreeEmptyState';
import type { Rule, RuleKind } from '@/types/bitcompass';

interface FileTreePreviewProps {
  rule: Rule | null;
}

const KIND_PLURALS: Record<RuleKind, string> = {
  rule: 'rules',
  skill: 'skills',
  command: 'commands',
  documentation: 'docs',
};

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) {
    const months = Math.floor(diffDay / 30);
    return `${months}mo ago`;
  }
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

export function FileTreePreview({ rule }: FileTreePreviewProps) {
  if (!rule) return <FileTreeEmptyState />;

  const colors = KIND_COLORS[rule.kind];
  const pullCommand = `bitcompass ${KIND_PLURALS[rule.kind]} pull ${rule.id}`;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <FileText className={cn('h-4 w-4 shrink-0', colors.file)} />
        <span className="truncate text-[14px] font-semibold text-foreground">
          {rule.title}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight',
            colors.badge,
          )}
        >
          {rule.kind}
        </span>
        {rule.always_apply && (
          <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-emerald-400">
            alwaysApply
          </span>
        )}
        <div className="flex-1" />
        <Link
          to={`/skills/${rule.id}`}
          className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          Open detail
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Metadata bar */}
      {((rule.technologies && rule.technologies.length > 0) ||
        rule.version ||
        rule.updated_at) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-4 py-2">
          {rule.technologies?.map((tech) => {
            const style = getTechStyle(tech);
            return (
              <span
                key={tech}
                className={cn(
                  'inline-flex rounded border px-2 py-0.5 text-[10px] font-medium',
                  style.bg,
                  style.text,
                  style.border,
                )}
              >
                {tech}
              </span>
            );
          })}
          {rule.version && (
            <span className="inline-flex rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              v{rule.version}
            </span>
          )}
          {rule.updated_at && (
            <span className="ml-auto text-[11px] text-muted-foreground/50">
              Updated {formatRelativeDate(rule.updated_at)}
            </span>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {rule.description && (
          <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
            {rule.description}
          </p>
        )}
        <MarkdownContent variant="compact" content={rule.body} />
      </div>

      {/* Footer with pull command */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <CodeBlockWithCopy code={pullCommand} />
      </div>
    </div>
  );
}
