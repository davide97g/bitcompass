import { Folder } from 'lucide-react';

interface FileTreeEmptyStateProps {
  message?: string;
}

export function FileTreeEmptyState({ message }: FileTreeEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
      <Folder className="h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground/70">
        {message ?? 'Select a file to preview'}
      </p>
      <p className="text-xs text-muted-foreground/40">
        Click any file in the tree
      </p>
    </div>
  );
}
