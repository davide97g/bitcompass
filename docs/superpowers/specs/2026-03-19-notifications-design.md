# Real-time Notification System

## Overview

Add an in-app real-time notification system to BitCompass webapp. Users receive toast notifications and a persistent notification center when someone pulls one of their watched files or pushes to a project they belong to.

## Watching Model

- **Projects:** Auto-watch — derived from `compass_project_members` membership. No separate table.
- **Rules:** Manual watch/unwatch — users explicitly toggle a watch icon on individual rules. Stored in `rule_watches` table.

## Data Model

### New Tables

#### `notifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK, default gen) | Primary key |
| `user_id` | `uuid` (FK → auth.users) | Notification recipient |
| `type` | `text` ('pull' \| 'push') | Action that triggered the notification |
| `rule_id` | `uuid` (FK → rules) | The rule acted upon |
| `rule_title` | `text` | Denormalized rule title at time of action |
| `project_id` | `uuid` (FK → compass_projects, nullable) | Associated project |
| `project_name` | `text` (nullable) | Denormalized project name |
| `actor_id` | `uuid` (FK → auth.users) | User who performed the action |
| `actor_name` | `text` | Denormalized actor display name |
| `read` | `boolean` (default false) | Whether the user has seen it |
| `dismissed` | `boolean` (default false) | Whether the user dismissed it |
| `created_at` | `timestamptz` (default now()) | Timestamp |

Indexes: `(user_id, read, dismissed, created_at DESC)` for efficient unread queries.

#### `rule_watches`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK, default gen) | Primary key |
| `user_id` | `uuid` (FK → auth.users) | Watcher |
| `rule_id` | `uuid` (FK → rules) | Watched rule |
| `created_at` | `timestamptz` (default now()) | When the watch was added |

Unique constraint: `(user_id, rule_id)`.

### RLS Policies

- `notifications`: Users can SELECT, UPDATE (read/dismissed only) their own rows (`user_id = auth.uid()`). INSERT restricted to service role (trigger).
- `rule_watches`: Users can SELECT, INSERT, DELETE their own rows (`user_id = auth.uid()`).

### Postgres Trigger

**Trigger:** `after_download_insert` on `downloads` table, fires `AFTER INSERT`.

**Logic:**
1. Determine watchers:
   - Query `rule_watches` for users watching this `rule_id`
   - Query `compass_project_members` for members of the rule's `project_id`
   - Union both sets, deduplicate
   - Exclude the actor (`NEW.user_id`)
2. For each watcher, INSERT into `notifications` with denormalized title/project/actor info (joined from `rules`, `compass_projects`, `profiles`)
3. Determine action type: map `downloads.editor` / `downloads.source` to 'pull' or 'push'
4. Call `pg_notify('notifications', json_payload)` for Supabase Realtime broadcast

## Real-time Architecture

Two parallel Supabase Realtime channels per connected client:

### Channel 1: Postgres Changes (Persistent)

```
supabase
  .channel('notifications-db')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, callback)
  .subscribe()
```

- Powers notification center: updates badge count, prepends new items to list
- On receive: invalidate React Query cache for notifications

### Channel 2: Broadcast (Ephemeral)

```
supabase
  .channel(`notifications:${userId}`)
  .on('broadcast', { event: 'new-notification' }, callback)
  .subscribe()
```

- Fired by the Postgres trigger via `pg_notify`
- Powers instant Sonner toast
- If user is offline, toast is lost but persistent notification remains in table

### Client-side Flow

```
App mount → subscribe to both channels + fetch initial unread count

Broadcast event → fire Sonner toast with NotificationToast component
Postgres Changes event → invalidate React Query → badge + list update

Offline → reconnect → React Query refetches unread notifications
```

## Frontend Components

### New Files

| File | Purpose |
|------|---------|
| `hooks/use-notifications.ts` | React Query queries (unread count, paginated list) + Supabase Realtime subscriptions + toast firing |
| `hooks/use-rule-watch.ts` | Watch/unwatch toggle, check watch status for a rule |
| `components/notifications/NotificationBell.tsx` | Bell icon button (Lucide `Bell`) with red badge counter, triggers Popover |
| `components/notifications/NotificationCenter.tsx` | Popover content: header ("Notifications" + count badge + "Mark all read" button with ⌘⇧D shortcut), scrollable list, "View all" footer |
| `components/notifications/NotificationItem.tsx` | Single row: action type badge (Pull=blue, Push=purple), rule title, project + author, view icon (Eye) + dismiss icon (X) |
| `components/notifications/NotificationToast.tsx` | Custom Sonner toast component with same layout as NotificationItem |

### Integration Points

- **`TopBar.tsx`**: Add `<NotificationBell />` between `<ThemeToggle />` and the avatar `<DropdownMenu>`
- **Rule detail page**: Add watch/unwatch toggle button (Eye icon with filled/outline state)
- **`App.tsx`**: No changes — `<Toaster />` (Sonner) already mounted

### Interactions

| Action | Result |
|--------|--------|
| Click notification row | Navigate to `/skills/{rule_id}`, mark as read |
| Click 👁️ (Eye icon) | Same as row click |
| Click ✕ (X icon) | Set `dismissed: true`, remove from list |
| "Mark all read" button | Batch update all unread → `read: true` |
| ⌘⇧D / Ctrl+Shift+D | Same as "Mark all read" (global keyboard shortcut) |
| Bell icon click | Toggle notification center popover |

### Visual Design

- **Bell icon**: Lucide `Bell`, ghost button style, positioned in TopBar
- **Badge**: Red circle with white count text, absolute-positioned top-right of bell
- **Action type badges**: Pull = blue (`text-blue-400`), Push = purple (`text-violet-400`), uppercase 10px
- **Unread items**: Subtle blue-tinted background (`bg-blue-950/20`)
- **Read items**: Dimmed opacity
- **Toast**: Same info layout as list item, appears bottom-right via Sonner

## Dependencies

- No new packages required
- Uses existing: `@supabase/supabase-js` (realtime), `sonner` (toasts), `lucide-react` (icons), `@tanstack/react-query` (data fetching), shadcn `Popover` + `Badge` components

## Out of Scope

- Email/push browser notifications
- Notification preferences/settings page
- Filtering notifications by type
- Full notification history page ("View all" is a future enhancement)
