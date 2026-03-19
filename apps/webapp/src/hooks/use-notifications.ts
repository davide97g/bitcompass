import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { toast as sonnerToast } from 'sonner';
import type { Notification } from '@/types/bitcompass';
import { createElement } from 'react';
import { NotificationToast } from '@/components/notifications/NotificationToast';

const TABLE = 'notifications';
const PAGE_SIZE = 20;

// ── Queries ──

export const useUnreadCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [TABLE, 'unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!supabase || !user?.id) return 0;
      const { count, error } = await supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('dismissed', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(supabase && user?.id),
  });
};

export const useNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [TABLE, 'list', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!supabase || !user?.id) return [];
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: Boolean(supabase && user?.id),
  });
};

// ── Mutations ──

export const useMarkAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from(TABLE)
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
    },
  });
};

export const useDismissNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from(TABLE)
        .update({ dismissed: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!supabase || !user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(TABLE)
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TABLE] });
    },
  });
};

// ── Toast ──

function fireNotificationToast(notification: Notification) {
  sonnerToast.custom(
    (toastId) =>
      createElement(NotificationToast, {
        notification,
        toastId,
        onView: (ruleId: string) => {
          sonnerToast.dismiss(toastId);
          window.location.href = `/skills/${ruleId}`;
        },
      }),
    { duration: 5000 }
  );
}

// ── Realtime subscription ──

export const useNotificationRealtime = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!supabase || !user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLE,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          fireNotificationToast(notification);
          qc.invalidateQueries({ queryKey: [TABLE] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
};
