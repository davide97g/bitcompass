# Real-time Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time in-app notifications (toast + persistent bell icon center) when users pull watched files or push to projects the user belongs to.

**Architecture:** Supabase Postgres triggers on `downloads` (pulls) and `rules` (pushes) fan out notifications to watchers. A single Supabase Realtime Postgres Changes subscription powers both Sonner toasts and a notification center popover in the TopBar. A `rule_watches` table stores explicit per-rule watch subscriptions; project watching is implicit via `compass_project_members`.

**Tech Stack:** Supabase (Postgres triggers, Realtime, RLS), React 18, TanStack React Query, Sonner, shadcn/ui (Popover, Badge), Lucide icons, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-03-19-notifications-design.md`

---

## File Structure

### New Files (webapp)

| File | Responsibility |
|------|---------------|
| `apps/webapp/supabase/migrations/20260319000003_create_rule_watches.sql` | Create `rule_watches` table + RLS + unique constraint |
| `apps/webapp/supabase/migrations/20260319000004_create_notifications.sql` | Create `notifications` table + RLS + indexes |
| `apps/webapp/supabase/migrations/20260319000005_add_updated_by_to_rules.sql` | Add `updated_by` column to `rules` |
| `apps/webapp/supabase/migrations/20260319000006_create_notification_triggers.sql` | Both trigger functions + triggers |
| `apps/webapp/src/types/bitcompass.ts` | Add `Notification`, `RuleWatch` interfaces (append to existing) |
| `apps/webapp/src/hooks/use-notifications.ts` | Queries + Realtime subscription + toast firing |
| `apps/webapp/src/hooks/use-rule-watch.ts` | Watch/unwatch mutations + status query |
| `apps/webapp/src/components/notifications/NotificationBell.tsx` | Bell button + badge + popover trigger |
| `apps/webapp/src/components/notifications/NotificationCenter.tsx` | Popover content: header, scrollable list, mark-all-read |
| `apps/webapp/src/components/notifications/NotificationItem.tsx` | Single notification row |
| `apps/webapp/src/components/notifications/NotificationToast.tsx` | Custom Sonner toast content |

### Modified Files

| File | Change |
|------|--------|
| `apps/webapp/src/components/layout/TopBar.tsx:157-158` | Insert `<NotificationBell />` between ThemeToggle and avatar dropdown |
| `apps/webapp/src/pages/RuleDetailPage.tsx:297` | Add watch/unwatch toggle button in the actions row |
| `packages/bitcompass-cli/src/api/client.ts:217-223` | Include `updated_by` in `updateRule` payload |
| `packages/bitcompass-cli/src/commands/sync.ts` | Pass authenticated user ID as `updated_by` on push operations |

---

## Task 1: Create `rule_watches` table migration

**Files:**
- Create: `apps/webapp/supabase/migrations/20260319000003_create_rule_watches.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- rule_watches: explicit per-rule watch subscriptions
create table if not exists public.rule_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid not null references public.rules(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, rule_id)
);

-- RLS
alter table public.rule_watches enable row level security;

create policy "Users can view own watches"
  on public.rule_watches for select
  using (auth.uid() = user_id);

create policy "Users can insert own watches"
  on public.rule_watches for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watches"
  on public.rule_watches for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

Run: `cd apps/webapp && bunx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add apps/webapp/supabase/migrations/20260319000003_create_rule_watches.sql
git commit -m "feat: create rule_watches table with RLS"
```

---

## Task 2: Create `notifications` table migration

**Files:**
- Create: `apps/webapp/supabase/migrations/20260319000004_create_notifications.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- notifications: persistent notification history
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('pull', 'push')),
  rule_id uuid not null references public.rules(id) on delete cascade,
  rule_title text not null,
  compass_project_id uuid references public.compass_projects(id) on delete set null,
  project_name text,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_name text not null,
  read boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Composite index for efficient unread queries
create index idx_notifications_user_unread
  on public.notifications (user_id, read, dismissed, created_at desc);

-- RLS
alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT restricted to trigger (SECURITY DEFINER function), no direct user inserts

-- Enable realtime for this table
alter publication supabase_realtime add table public.notifications;
```

- [ ] **Step 2: Apply the migration**

Run: `cd apps/webapp && bunx supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add apps/webapp/supabase/migrations/20260319000004_create_notifications.sql
git commit -m "feat: create notifications table with RLS and realtime"
```

---

## Task 3: Add `updated_by` column to `rules`

**Files:**
- Create: `apps/webapp/supabase/migrations/20260319000005_add_updated_by_to_rules.sql`
- Modify: `apps/webapp/src/types/bitcompass.ts:5-31` (Rule interface)

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add updated_by to track who last modified a rule (for push notification attribution)
alter table public.rules
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
```

- [ ] **Step 2: Update the `Rule` interface in types**

In `apps/webapp/src/types/bitcompass.ts`, add `updated_by` to the `Rule` interface (after line 28, before `created_at`):

```typescript
  /** Last user who modified this rule (for notification attribution). */
  updated_by?: string | null;
```

Also add `updated_by` to `RuleInsert` interface (after line 51, before the closing brace):

```typescript
  /** Set to authenticated user ID on update for notification attribution. */
  updated_by?: string | null;
```

- [ ] **Step 3: Apply the migration**

Run: `cd apps/webapp && bunx supabase db push`

- [ ] **Step 4: Commit**

```bash
git add apps/webapp/supabase/migrations/20260319000005_add_updated_by_to_rules.sql apps/webapp/src/types/bitcompass.ts
git commit -m "feat: add updated_by column to rules for push attribution"
```

---

## Task 4: Create notification trigger functions

**Files:**
- Create: `apps/webapp/supabase/migrations/20260319000006_create_notification_triggers.sql`

- [ ] **Step 1: Write the triggers migration**

```sql
-- Trigger function for pull notifications (downloads table)
create or replace function public.notify_on_download()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_title text;
  v_project_id uuid;
  v_project_name text;
  v_actor_name text;
  v_watcher_id uuid;
begin
  -- Fetch rule info
  select r.title, r.project_id
    into v_rule_title, v_project_id
    from public.rules r
    where r.id = NEW.rule_id;

  if v_rule_title is null then
    return NEW;
  end if;

  -- Fetch project name if applicable
  if v_project_id is not null then
    select cp.title into v_project_name
      from public.compass_projects cp
      where cp.id = v_project_id;
  end if;

  -- Fetch actor display name
  select coalesce(p.full_name, p.email, 'Unknown')
    into v_actor_name
    from public.profiles p
    where p.id = NEW.user_id;

  if v_actor_name is null then
    v_actor_name := 'Unknown';
  end if;

  -- Insert notification for each watcher (rule watchers + project members), excluding actor
  for v_watcher_id in
    select distinct w.user_id
    from (
      -- Users watching this rule
      select rw.user_id from public.rule_watches rw where rw.rule_id = NEW.rule_id
      union
      -- Members of the rule's project
      select cpm.user_id from public.compass_project_members cpm where cpm.project_id = v_project_id and v_project_id is not null
    ) w
    where w.user_id <> NEW.user_id
  loop
    insert into public.notifications (user_id, type, rule_id, rule_title, compass_project_id, project_name, actor_id, actor_name)
    values (v_watcher_id, 'pull', NEW.rule_id, v_rule_title, v_project_id, v_project_name, NEW.user_id, v_actor_name);
  end loop;

  return NEW;
end;
$$;

-- Trigger function for push notifications (rules table)
create or replace function public.notify_on_rule_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
  v_actor_id uuid;
  v_actor_name text;
  v_watcher_id uuid;
begin
  -- Guard: on UPDATE, only fire when version changes
  if TG_OP = 'UPDATE' and NEW.version is not distinct from OLD.version then
    return NEW;
  end if;

  -- Determine actor
  v_actor_id := coalesce(NEW.updated_by, NEW.user_id);

  -- Fetch project name if applicable
  if NEW.project_id is not null then
    select cp.title into v_project_name
      from public.compass_projects cp
      where cp.id = NEW.project_id;
  end if;

  -- Fetch actor display name
  select coalesce(p.full_name, p.email, 'Unknown')
    into v_actor_name
    from public.profiles p
    where p.id = v_actor_id;

  if v_actor_name is null then
    v_actor_name := 'Unknown';
  end if;

  -- Insert notification for each watcher, excluding actor
  for v_watcher_id in
    select distinct w.user_id
    from (
      select rw.user_id from public.rule_watches rw where rw.rule_id = NEW.id
      union
      select cpm.user_id from public.compass_project_members cpm where cpm.project_id = NEW.project_id and NEW.project_id is not null
    ) w
    where w.user_id <> v_actor_id
  loop
    insert into public.notifications (user_id, type, rule_id, rule_title, compass_project_id, project_name, actor_id, actor_name)
    values (v_watcher_id, 'push', NEW.id, NEW.title, NEW.project_id, v_project_name, v_actor_id, v_actor_name);
  end loop;

  return NEW;
end;
$$;

-- Create triggers
create trigger after_download_insert
  after insert on public.downloads
  for each row execute function public.notify_on_download();

create trigger after_rule_upsert
  after insert or update on public.rules
  for each row execute function public.notify_on_rule_push();
```

- [ ] **Step 2: Apply the migration**

Run: `cd apps/webapp && bunx supabase db push`

- [ ] **Step 3: Commit**

```bash
git add apps/webapp/supabase/migrations/20260319000006_create_notification_triggers.sql
git commit -m "feat: add notification trigger functions for pull and push events"
```

---

## Task 5: Add TypeScript types for Notification and RuleWatch

**Files:**
- Modify: `apps/webapp/src/types/bitcompass.ts:94-102` (append after Download interface)

- [ ] **Step 1: Add types**

Append after the `Download` interface (line 102) in `apps/webapp/src/types/bitcompass.ts`:

```typescript

export type NotificationType = 'pull' | 'push';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  rule_id: string;
  rule_title: string;
  compass_project_id: string | null;
  project_name: string | null;
  actor_id: string;
  actor_name: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
}

export interface RuleWatch {
  id: string;
  user_id: string;
  rule_id: string;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/webapp/src/types/bitcompass.ts
git commit -m "feat: add Notification and RuleWatch TypeScript types"
```

---

## Task 6: Create `use-rule-watch` hook

**Files:**
- Create: `apps/webapp/src/hooks/use-rule-watch.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import type { RuleWatch } from '@/types/bitcompass';

const TABLE = 'rule_watches';

export const useRuleWatch = (ruleId: string | undefined) => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [TABLE, ruleId, userId],
    queryFn: async (): Promise<RuleWatch | null> => {
      if (!supabase || !ruleId || !userId) return null;
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('rule_id', ruleId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as RuleWatch | null;
    },
    enabled: Boolean(supabase && ruleId && userId),
  });
};

export const useToggleRuleWatch = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ruleId, isWatching }: { ruleId: string; isWatching: boolean }) => {
      if (!supabase || !user?.id) throw new Error('Not authenticated');
      if (isWatching) {
        const { error } = await supabase
          .from(TABLE)
          .delete()
          .eq('rule_id', ruleId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLE)
          .insert({ rule_id: ruleId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, { ruleId }) => {
      qc.invalidateQueries({ queryKey: [TABLE, ruleId] });
    },
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/webapp/src/hooks/use-rule-watch.ts
git commit -m "feat: add use-rule-watch hook for watch/unwatch toggle"
```

---

## Task 7: Create `use-notifications` hook

**Files:**
- Create: `apps/webapp/src/hooks/use-notifications.ts`

This is the core hook — it handles React Query for data, Supabase Realtime subscription, and toast firing.

- [ ] **Step 1: Write the hook**

```typescript
import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { toast as sonnerToast } from 'sonner';
import type { Notification } from '@/types/bitcompass';

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

// ── Toast (stub — replaced in Task 10 with NotificationToast component) ──

function fireNotificationToast(notification: Notification) {
  const label = notification.type === 'pull' ? '⬇️ Pull' : '⬆️ Push';
  sonnerToast(`${label}: ${notification.rule_title}`, { duration: 5000 });
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
          // Toast firing is wired up in Task 10 after NotificationToast component exists
          fireNotificationToast(notification);
          // Invalidate queries to refresh list + count
          qc.invalidateQueries({ queryKey: [TABLE] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/webapp/src/hooks/use-notifications.ts
git commit -m "feat: add use-notifications hook with queries, mutations, and realtime"
```

---

## Task 8: Create `NotificationItem` component

**Files:**
- Create: `apps/webapp/src/components/notifications/NotificationItem.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-content-center text-sm ${
        isPull ? 'bg-blue-950/30' : 'bg-violet-950/30'
      }`}>
        <span className="flex items-center justify-center w-full h-full">
          {isPull ? '⬇️' : '⬆️'}
        </span>
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/webapp/src/components/notifications/NotificationItem.tsx
git commit -m "feat: add NotificationItem component"
```

---

## Task 9: Create `NotificationCenter` component

**Files:**
- Create: `apps/webapp/src/components/notifications/NotificationCenter.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/webapp/src/components/notifications/NotificationCenter.tsx
git commit -m "feat: add NotificationCenter component with scrollable list"
```

---

## Task 10: Create `NotificationToast` component and wire up realtime

**Files:**
- Create: `apps/webapp/src/components/notifications/NotificationToast.tsx`
- Modify: `apps/webapp/src/hooks/use-notifications.ts` (update the realtime toast callback)

- [ ] **Step 1: Write the toast component**

```tsx
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
```

- [ ] **Step 2: Update `use-notifications.ts` to use NotificationToast**

In `apps/webapp/src/hooks/use-notifications.ts`, make these changes:

1. Add import at the top (after the existing `sonnerToast` import):
```typescript
import { createElement } from 'react';
import { NotificationToast } from '@/components/notifications/NotificationToast';
```

2. Replace the `fireNotificationToast` stub function with:
```typescript
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
```

Note: `sonnerToast` is already imported as `import { toast as sonnerToast } from 'sonner'` from Task 7.

- [ ] **Step 3: Commit**

```bash
git add apps/webapp/src/components/notifications/NotificationToast.tsx apps/webapp/src/hooks/use-notifications.ts
git commit -m "feat: add NotificationToast component and wire up realtime toast"
```

---

## Task 11: Create `NotificationBell` component

**Files:**
- Create: `apps/webapp/src/components/notifications/NotificationBell.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUnreadCount, useNotificationRealtime, useMarkAllAsRead } from '@/hooks/use-notifications';
import { NotificationCenter } from './NotificationCenter';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();

  // Activate realtime subscription
  useNotificationRealtime();

  // Global keyboard shortcut: Cmd+Shift+D / Ctrl+Shift+D
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        markAllAsRead.mutate();
      }
    },
    [markAllAsRead]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 w-auto" sideOffset={8}>
        <NotificationCenter onClose={() => setOpen(false)} unreadCount={unreadCount} />
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/webapp/src/components/notifications/NotificationBell.tsx
git commit -m "feat: add NotificationBell component with popover and keyboard shortcut"
```

---

## Task 12: Integrate NotificationBell into TopBar

**Files:**
- Modify: `apps/webapp/src/components/layout/TopBar.tsx:18,157-158`

- [ ] **Step 1: Add import**

Add to imports at top of `TopBar.tsx` (after line 21):

```typescript
import { NotificationBell } from '@/components/notifications/NotificationBell';
```

- [ ] **Step 2: Insert NotificationBell between ThemeToggle and avatar**

In the `<div className="flex items-center gap-3 ml-auto shrink-0">` block (line 157), add `<NotificationBell />` after `<ThemeToggle />`:

Change line 158 from:
```tsx
        <ThemeToggle />
        <DropdownMenu>
```
to:
```tsx
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd apps/webapp && bun run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/webapp/src/components/layout/TopBar.tsx
git commit -m "feat: integrate NotificationBell into TopBar"
```

---

## Task 13: Add watch/unwatch toggle to RuleDetailPage

**Files:**
- Modify: `apps/webapp/src/pages/RuleDetailPage.tsx:17,29-49,297-304`

- [ ] **Step 1: Add imports**

Add to existing imports in `RuleDetailPage.tsx`:

After the lucide-react import block (around line 49), add `Eye, EyeOff` to the icon imports (if `Eye` is not already imported — it's not in the current list).

Add hook import after line 27:
```typescript
import { useRuleWatch, useToggleRuleWatch } from '@/hooks/use-rule-watch';
```

- [ ] **Step 2: Add watch state and handler**

Inside the component function, after the existing hooks (around line where `useAuth`, `useToast` etc. are), add:

```typescript
  const { data: watchData } = useRuleWatch(id);
  const toggleWatch = useToggleRuleWatch();
  const isWatching = Boolean(watchData);
```

- [ ] **Step 3: Add watch button to the actions row**

In the actions row (around line 297-304), add a watch toggle button before the edit button. Inside the `{!editing ? (<> ... </>)` block, add as the first element:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => toggleWatch.mutate({ ruleId: rule.id, isWatching })}
  className="h-8 w-8 p-0"
  aria-label={isWatching ? 'Unwatch' : 'Watch'}
  disabled={toggleWatch.isPending}
>
  {isWatching ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</Button>
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd apps/webapp && bun run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/webapp/src/pages/RuleDetailPage.tsx
git commit -m "feat: add watch/unwatch toggle to RuleDetailPage"
```

---

## Task 14: Update CLI to pass `updated_by` on push operations

**Files:**
- Modify: `packages/bitcompass-cli/src/api/client.ts:217-223`
- Modify: `packages/bitcompass-cli/src/commands/sync.ts` (push-update and push-new blocks)

- [ ] **Step 1: Update `updateRule` in CLI client to accept `updated_by`**

The `updateRule` function in `packages/bitcompass-cli/src/api/client.ts:217` already accepts `Partial<RuleInsert>`. Since we added `updated_by` to `RuleInsert` in Task 3, no client changes needed here.

- [ ] **Step 2: Pass `updated_by` in sync push-update**

In `packages/bitcompass-cli/src/commands/sync.ts`:

1. Add import at the top:
```typescript
import { getCurrentUserId } from '../api/client';
```

2. Before the sync execution loop (around line 400, before the `for (const item of toSync)` block), get the current user ID:
```typescript
  const currentUserId = await getCurrentUserId();
```

3. In the push-update `updateRule` call (around line 434-442), add `updated_by` to the payload:
```typescript
        updated_by: currentUserId,
```

The push-new `insertRule` call does not need `updated_by` (the trigger uses `user_id` for new rules).

- [ ] **Step 3: Add `getCurrentUserId` helper**

In `packages/bitcompass-cli/src/api/client.ts`, add:

```typescript
export const getCurrentUserId = async (): Promise<string | null> => {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/bitcompass-cli/src/api/client.ts packages/bitcompass-cli/src/commands/sync.ts
git commit -m "feat: pass updated_by on CLI push operations for notification attribution"
```

---

## Task 15: Final build verification and manual smoke test

- [ ] **Step 1: Run full build**

Run: `cd /Users/davideghiotto/Desktop/projects/bitcompass && bun run build`
Expected: All packages build successfully.

- [ ] **Step 2: Start the dev server and verify visually**

Run: `cd apps/webapp && bun run dev`

Manual checks:
1. Bell icon appears in TopBar between theme toggle and avatar
2. Clicking bell opens notification center popover (empty state: "No notifications")
3. On a rule detail page, watch/unwatch eye icon appears in the header actions
4. Clicking watch icon toggles state (eye ↔ eye-off)
5. Cmd+Shift+D / Ctrl+Shift+D triggers "mark all read" (no error in console)

- [ ] **Step 3: Verify Supabase Realtime connection**

Open browser DevTools → Network → WS tab. Confirm a WebSocket connection to Supabase Realtime is established with the `notifications-realtime` channel.

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: address build issues from notification system integration"
```
