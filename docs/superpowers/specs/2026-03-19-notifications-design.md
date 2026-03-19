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
| `compass_project_id` | `uuid` (FK → compass_projects, nullable) | Associated project |
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

### Postgres Triggers

Two triggers generate notifications for different actions:

#### Column name mapping

The `rules` table uses `project_id` while `downloads` and `notifications` use `compass_project_id`. These refer to the same FK target (`compass_projects.id`). Triggers must map accordingly:
- Trigger 1: use `downloads.compass_project_id` for the project lookup
- Trigger 2: use `rules.project_id` → store as `notifications.compass_project_id`

When `project_id` is NULL, skip the `compass_project_members` query and set `project_name = NULL`.

#### Actor identification for push

The `rules` table has no `updated_by` column — `user_id` is the original owner. To correctly attribute push actions, add an `updated_by` column to `rules`:

| Column | Type | Description |
|--------|------|-------------|
| `updated_by` | `uuid` (FK → auth.users, nullable) | Last user who modified the rule |

This column is set by the client on update (CLI sync sets it to the authenticated user). The trigger uses `COALESCE(NEW.updated_by, NEW.user_id)` as the actor.

#### Trigger function privileges

Both trigger functions are created with `SECURITY DEFINER` to bypass RLS on the `notifications` table (since RLS restricts INSERT to service role).

#### Trigger 1: `after_download_insert` on `downloads` table

Fires `AFTER INSERT`. All downloads are pulls (the `downloads` table only tracks pull activity from CLI/MCP/sync).

**Logic:**
1. Determine watchers:
   - Query `rule_watches` for users watching `NEW.rule_id`
   - Query `compass_project_members` for members of `NEW.compass_project_id` (skip if NULL)
   - Union both sets, deduplicate
   - Exclude the actor (`NEW.user_id`)
2. For each watcher, INSERT into `notifications` with `type = 'pull'` and denormalized title/project/actor info (joined from `rules`, `compass_projects`, `profiles`)

#### Trigger 2: `after_rule_upsert` on `rules` table

Fires `AFTER INSERT OR UPDATE`. Pushes are represented as inserts or updates to the `rules` table (from CLI sync push-new / push-update).

**Logic:**
1. Determine watchers:
   - Query `rule_watches` for users watching `NEW.id`
   - Query `compass_project_members` for members of `NEW.project_id` (skip if NULL)
   - Union both sets, deduplicate
   - Exclude the actor (`COALESCE(NEW.updated_by, NEW.user_id)`)
2. For each watcher, INSERT into `notifications` with `type = 'push'` and denormalized info

**Guard:** To avoid noisy notifications on minor edits, only fire when `NEW.version IS DISTINCT FROM OLD.version` (for updates) or always for inserts.

## Real-time Architecture

**Single Supabase Realtime channel** per connected client using Postgres Changes:

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

This single channel powers both:
- **Toast:** On new event, immediately fire a Sonner toast with the notification payload
- **Notification center:** Invalidate React Query cache → badge count updates + list refreshes

No separate Broadcast channel needed — Postgres Changes already delivers the INSERT event in real-time with the full row payload, which is sufficient for both toast and list updates.

### Client-side Flow

```
App mount → subscribe to Postgres Changes on notifications table + fetch initial unread count

New INSERT event arrives:
  → Fire Sonner toast with NotificationToast component
  → Invalidate React Query cache → badge + list update

Offline → reconnect → React Query refetches unread notifications (no missed persistent data)
```

## Frontend Components

### New Files

| File | Purpose |
|------|---------|
| `hooks/use-notifications.ts` | React Query queries (unread count, paginated list) + Supabase Realtime subscriptions + toast firing |
| `hooks/use-rule-watch.ts` | Watch/unwatch toggle, check watch status for a rule |
| `components/notifications/NotificationBell.tsx` | Bell icon button (Lucide `Bell`) with red badge counter, triggers Popover |
| `components/notifications/NotificationCenter.tsx` | Popover content: header ("Notifications" + count badge + "Mark all read" button with ⌘⇧D shortcut), scrollable list |
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
- Full notification history page
- Notification retention/cleanup (may be needed at scale, deferred)
