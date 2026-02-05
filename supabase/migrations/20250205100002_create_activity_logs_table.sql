-- Activity logs: private, user-scoped git activity summaries (from CLI/MCP)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  time_frame text not null check (time_frame in ('day', 'week', 'month')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  repo_summary jsonb not null default '{}'::jsonb,
  git_analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_id_idx on public.activity_logs (user_id);
create index if not exists activity_logs_user_id_created_idx on public.activity_logs (user_id, created_at desc);

alter table public.activity_logs enable row level security;

create policy activity_logs_select_own on public.activity_logs
  for select using (auth.uid() = user_id);
create policy activity_logs_insert_own on public.activity_logs
  for insert with check (auth.uid() = user_id);
create policy activity_logs_update_own on public.activity_logs
  for update using (auth.uid() = user_id);
create policy activity_logs_delete_own on public.activity_logs
  for delete using (auth.uid() = user_id);

create or replace function public.activity_logs_set_user_id_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id = auth.uid();
  return new;
end;
$$;

drop trigger if exists activity_logs_set_user_id_on_insert on public.activity_logs;
create trigger activity_logs_set_user_id_on_insert
  before insert on public.activity_logs
  for each row
  execute function public.activity_logs_set_user_id_on_insert();
