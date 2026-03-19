import { cn } from '@/lib/utils';
import { FileText, Star } from 'lucide-react';
import type { RuleKind } from '@/types/bitcompass';
import type { TreeFile } from './file-tree-constants';
import { KIND_COLORS, SPECIAL_FILE_COLOR } from './file-tree-constants';

interface FileTreeFileItemProps {
  file: TreeFile;
  isSelected: boolean;
  onClick: () => void;
  kind: RuleKind;
  isSpecial?: boolean;
}

export function FileTreeFileItem({
  file,
  isSelected,
  onClick,
  kind,
  isSpecial = false,
}: FileTreeFileItemProps) {
  const colors = isSpecial ? SPECIAL_FILE_COLOR : KIND_COLORS[kind];
  const Icon = isSpecial ? Star : FileText;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left',
        'text-[13px] font-mono transition-all duration-150',
        'hover:bg-white/[0.03]',
        isSelected && [
          'bg-white/5 border-l-2',
          kind === 'rule' && !isSpecial && 'border-l-sky-400',
          kind === 'skill' && !isSpecial && 'border-l-violet-400',
          kind === 'command' && !isSpecial && 'border-l-amber-400',
          kind === 'documentation' && !isSpecial && 'border-l-emerald-400',
          isSpecial && 'border-l-orange-400',
        ],
        !isSelected && 'border-l-2 border-l-transparent',
      )}
    >
      <Icon
        className={cn('h-3.5 w-3.5 shrink-0 transition-colors', colors.file)}
      />
      <span
        className={cn(
          'truncate text-muted-foreground transition-colors',
          isSelected && 'text-foreground',
          'group-hover:text-foreground/80',
        )}
        title={file.filename}
      >
        {file.filename}
      </span>
    </button>
  );
}
