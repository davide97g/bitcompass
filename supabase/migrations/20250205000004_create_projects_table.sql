-- Projects table: user-created projects (seed data remains in frontend, merged in hooks)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  context text default '',
  tech_stack text[] default '{}',
  status text not null check (status in ('active', 'completed', 'on-hold', 'planning')),
  related_problems text[] default '{}',
  team text[] default '{}',
  start_date text not null default '',
  end_date text,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_user_id_created_idx on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;

create policy projects_select_own on public.projects
  for select using (auth.uid() = user_id);
create policy projects_insert_own on public.projects
  for insert with check (auth.uid() = user_id);
create policy projects_update_own on public.projects
  for update using (auth.uid() = user_id);
create policy projects_delete_own on public.projects
  for delete using (auth.uid() = user_id);

create or replace function public.projects_set_user_id_on_insert()
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

drop trigger if exists projects_set_user_id_on_insert on public.projects;
create trigger projects_set_user_id_on_insert
  before insert on public.projects
  for each row
  execute function public.projects_set_user_id_on_insert();
