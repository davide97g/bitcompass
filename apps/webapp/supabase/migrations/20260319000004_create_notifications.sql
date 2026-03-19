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
