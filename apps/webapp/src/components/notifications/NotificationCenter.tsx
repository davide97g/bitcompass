import { useNotifications, useMarkAllAsRead } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationCenterProps {
  onClose: () => void;
  unreadCount: number;
}

export function NotificationCenter({ onClose, unreadCount }: NotificationCenterProps) {
  const { data: notifications = [] } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <div className="w-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[11px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
            <kbd className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              ⌘⇧D
            </kbd>
          </div>
        )}
      </div>

      {/* List */}
      <ScrollArea className="max-h-[360px]">
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onNavigate={onClose}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
