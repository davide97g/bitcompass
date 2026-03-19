import { Button } from '@/components/ui/button';
import type { Notification } from '@/types/bitcompass';
import { Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMarkAsRead, useDismissNotification } from '@/hooks/use-notifications';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationItemProps {
  notification: Notification;
  onNavigate?: () => void;
}

export function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();
  const dismiss = useDismissNotification();

  const handleView = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    markAsRead.mutate(notification.id);
    navigate(`/skills/${notification.rule_id}`);
    onNavigate?.();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismiss.mutate(notification.id);
  };

  const isPull = notification.type === 'pull';

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${
        !notification.read ? 'bg-blue-950/10 dark:bg-blue-950/20' : 'opacity-60'
      }`}
      onClick={handleView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleView()}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
        isPull ? 'bg-blue-950/30' : 'bg-violet-950/30'
      }`}>
        {isPull ? '⬇️' : '⬆️'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
            isPull ? 'text-blue-400' : 'text-violet-400'
          }`}>
            {notification.type}
          </span>
          <span className="text-[10px] text-muted-foreground/50">·</span>
          <span className="text-[11px] text-muted-foreground">{timeAgo(notification.created_at)}</span>
        </div>
        <div className="text-sm font-medium text-foreground truncate">{notification.rule_title}</div>
        <div className="flex items-center gap-1 mt-0.5">
          {notification.project_name && (
            <>
              <span className="text-[11px] text-muted-foreground">{notification.project_name}</span>
              <span className="text-[10px] text-muted-foreground/50">·</span>
            </>
          )}
          <span className="text-[11px] text-muted-foreground">{notification.actor_name}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 flex-shrink-0 pt-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleView}
          aria-label="View"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
