import type { Notification } from '@/types/bitcompass';
import { Eye, X } from 'lucide-react';
import { toast as sonnerDismiss } from 'sonner';

interface NotificationToastProps {
  notification: Notification;
  toastId: string | number;
  onView: (ruleId: string) => void;
}

export function NotificationToast({ notification, toastId, onView }: NotificationToastProps) {
  const isPull = notification.type === 'pull';

  return (
    <div className="flex items-start gap-2.5 w-full">
      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs ${
        isPull ? 'bg-blue-950/30' : 'bg-violet-950/30'
      }`}>
        {isPull ? '⬇️' : '⬆️'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
            isPull ? 'text-blue-400' : 'text-violet-400'
          }`}>
            {notification.type}
          </span>
          <span className="text-[10px] text-muted-foreground/50">·</span>
          <span className="text-[11px] text-muted-foreground">just now</span>
        </div>
        <div className="text-sm font-medium text-foreground truncate mt-0.5">{notification.rule_title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {notification.project_name ? `${notification.project_name} · ` : ''}{notification.actor_name}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          className="h-7 w-7 rounded-md flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors"
          onClick={() => onView(notification.rule_id)}
          aria-label="View"
        >
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          className="h-7 w-7 rounded-md flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors"
          onClick={() => sonnerDismiss.dismiss(toastId)}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
