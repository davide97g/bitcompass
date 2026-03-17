-- Automations table: user-created automations (seed data remains in frontend, merged in hooks)
-- steps stored as JSONB: [{ order: number, title: string, description: string }]
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null check (category in (
    'onboarding', 'deployment', 'monitoring', 'notifications', 'data-sync', 'development', 'other'
  )),
  steps jsonb not null default '[]'::jsonb,
  video_thumbnail text not null default '',
  trigger_label text,
  steps_with_ai integer[] default '{}',
  benefits text[] default '{}',
  authors text[] default '{}',
  github_url text,
  doc_link text,
  created_at timestamptz not null default now()
);

create index if not exists automations_user_id_idx on public.automations (user_id);
create index if not exists automations_user_id_created_idx on public.automations (user_id, created_at desc);

alter table public.automations enable row level security;

create policy automations_select_own on public.automations
  for select using (auth.uid() = user_id);
create policy automations_insert_own on public.automations
  for insert with check (auth.uid() = user_id);
create policy automations_update_own on public.automations
  for update using (auth.uid() = user_id);
create policy automations_delete_own on public.automations
  for delete using (auth.uid() = user_id);

create or replace function public.automations_set_user_id_on_insert()
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

drop trigger if exists automations_set_user_id_on_insert on public.automations;
create trigger automations_set_user_id_on_insert
  before insert on public.automations
  for each row
  execute function public.automations_set_user_id_on_insert();
