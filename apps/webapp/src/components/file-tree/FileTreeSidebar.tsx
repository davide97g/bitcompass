import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import type { FileTree } from './file-tree-constants';
import { KIND_COLORS, SPECIAL_FILE_COLOR } from './file-tree-constants';
import { FileTreeFolder } from './FileTreeFolder';
import { FileTreeFileItem } from './FileTreeFileItem';

interface FileTreeSidebarProps {
  tree: FileTree;
  selectedFileId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (id: string) => void;
  isLoading: boolean;
  truncated?: boolean;
  total?: number;
}

export function FileTreeSidebar({
  tree,
  selectedFileId,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  isLoading,
  truncated,
  total,
}: FileTreeSidebarProps) {
  const nonEmptyFolders = tree.folders.filter((f) => f.files.length > 0);

  return (
    <div className="flex h-full flex-col bg-black/10 dark:bg-white/[0.01]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60">
          {tree.editorBase}
        </span>
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {isLoading ? (
            <div className="space-y-2 px-3 py-2">
              <Skeleton className="h-5 w-[85%]" />
              <Skeleton className="h-5 w-[70%]" />
              <Skeleton className="h-5 w-[90%]" />
              <Skeleton className="h-5 w-[60%]" />
              <Skeleton className="h-5 w-[75%]" />
            </div>
          ) : (
            <>
              {/* Kind folders */}
              {nonEmptyFolders.map((folder) => (
                <FileTreeFolder
                  key={folder.name}
                  folder={folder}
                  isExpanded={expandedFolders.has(folder.name)}
                  onToggle={() => onToggleFolder(folder.name)}
                  selectedFileId={selectedFileId}
                  onSelectFile={onSelectFile}
                />
              ))}

              {/* Special files section */}
              {tree.specialFiles.length > 0 && (
                <>
                  <div className="mx-3 my-2 border-t border-white/[0.06]" />
                  <div className="px-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Special Files
                    </span>
                  </div>
                  {tree.specialFiles.map((file) => (
                    <div key={file.ruleId} className="px-1">
                      <FileTreeFileItem
                        file={file}
                        isSelected={selectedFileId === file.ruleId}
                        onClick={() => onSelectFile(file.ruleId)}
                        kind="rule"
                        isSpecial
                      />
                    </div>
                  ))}
                </>
              )}

              {/* Truncation notice */}
              {truncated && (
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400/70" />
                  <span className="text-[11px] text-amber-400/70">
                    Showing partial results
                    {total != null && ` (${total} total)`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Stats footer */}
      {!isLoading && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] bg-black/10 px-3 py-2 dark:bg-white/[0.01]">
          {tree.stats.totalFiles > 0 && (
            <>
              {nonEmptyFolders.map((folder) => (
                <span
                  key={folder.kind}
                  className={cn(
                    'text-[10px] font-medium',
                    KIND_COLORS[folder.kind].file,
                  )}
                >
                  {folder.files.length} {folder.name}
                </span>
              ))}
            </>
          )}
          {tree.stats.totalSpecialFiles > 0 && (
            <span
              className={cn('text-[10px] font-medium', SPECIAL_FILE_COLOR.file)}
            >
              {tree.stats.totalSpecialFiles} special
            </span>
          )}
        </div>
      )}
    </div>
  );
}
