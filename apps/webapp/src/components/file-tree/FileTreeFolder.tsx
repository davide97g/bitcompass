import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import type { TreeFolder } from './file-tree-constants';
import { KIND_COLORS } from './file-tree-constants';
import { FileTreeFileItem } from './FileTreeFileItem';

interface FileTreeFolderProps {
  folder: TreeFolder;
  isExpanded: boolean;
  onToggle: () => void;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
}

export function FileTreeFolder({
  folder,
  isExpanded,
  onToggle,
  selectedFileId,
  onSelectFile,
}: FileTreeFolderProps) {
  const colors = KIND_COLORS[folder.kind];
  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-1.5 px-2 py-1 text-[13px]',
            'rounded-sm transition-colors duration-150',
            'hover:bg-white/[0.03]',
          )}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200',
              isExpanded && 'rotate-90',
            )}
          />
          <FolderIcon
            className={cn('h-3.5 w-3.5 shrink-0 transition-colors', colors.folder)}
          />
          <span className="truncate font-medium text-foreground/90">
            {folder.name}
          </span>
          <span
            className={cn(
              'ml-auto shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium leading-tight',
              colors.badge,
            )}
          >
            {folder.files.length}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pl-3">
        {folder.files.map((file) => (
          <FileTreeFileItem
            key={file.ruleId}
            file={file}
            isSelected={selectedFileId === file.ruleId}
            onClick={() => onSelectFile(file.ruleId)}
            kind={folder.kind}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
