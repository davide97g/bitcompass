import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';

export type MCPServerStatus = 'ok' | 'error';

interface MCPServerRowProps {
  name: string;
  status: MCPServerStatus;
  statusMessage?: string;
  enabled: boolean;
  onShowOutput?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: (enabled: boolean) => void;
  className?: string;
}

const getInitial = (name: string): string => {
  if (!name.trim()) return '?';
  return name.trim().charAt(0).toUpperCase();
};

export function MCPServerRow({
  name,
  status,
  statusMessage,
  enabled,
  onShowOutput,
  onEdit,
  onDelete,
  onToggle,
  className,
}: MCPServerRowProps) {
  const isError = status === 'error';
  const subtext = statusMessage ?? (isError ? 'Error - Show Output' : 'Ready');

  const handleShowOutputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onShowOutput?.();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit?.();
    }
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDelete?.();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground',
        className
      )}
      role="listitem"
      aria-label={`MCP server: ${name}, ${isError ? 'error' : 'ready'}`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10 bg-muted">
          <AvatarFallback className="text-sm font-medium text-muted-foreground">
            {getInitial(name)}
          </AvatarFallback>
        </Avatar>
        {isError && (
          <span
            className="absolute -bottom-0.5 -left-0.5 h-3 w-3 border-2 border-card bg-destructive"
            aria-hidden
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground truncate">{name}</p>
        {onShowOutput ? (
          <button
            type="button"
            onClick={onShowOutput}
            onKeyDown={handleShowOutputKeyDown}
            className={cn(
              'text-sm truncate text-left transition-colors duration-ui ease-out hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
              isError ? 'text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-foreground'
            )}
            tabIndex={0}
            aria-label={`${subtext}, show output`}
          >
            {subtext}
          </button>
        ) : (
          <p className={cn('text-sm truncate', isError ? 'text-destructive' : 'text-muted-foreground')}>
            {subtext}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            onKeyDown={handleEditKeyDown}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Edit ${name}`}
            tabIndex={0}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            onKeyDown={handleDeleteKeyDown}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Delete ${name}`}
            tabIndex={0}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {onToggle && (
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            aria-label={`${enabled ? 'Disable' : 'Enable'} ${name}`}
          />
        )}
      </div>
    </div>
  );
}
