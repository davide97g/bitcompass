-- BitCompass rules table (rules and solutions as kind)
-- Run with: supabase db push (or apply via Supabase dashboard)

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('rule', 'solution')),
  title text not null,
  description text not null default '',
  body text not null default '',
  context text,
  examples jsonb default '[]'::jsonb,
  technologies text[] default '{}',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for listing by user and kind
create index if not exists rules_user_id_kind_idx on public.rules (user_id, kind);
create index if not exists rules_created_at_idx on public.rules (created_at desc);

-- Full-text search: generated column + GIN index
alter table public.rules add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C')
  ) stored;
create index if not exists rules_search_idx on public.rules using gin (search_vector);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rules_updated_at on public.rules;
create trigger rules_updated_at
  before update on public.rules
  for each row execute function public.set_updated_at();

-- RLS: users see and manage only their own rows
alter table public.rules enable row level security;

drop policy if exists rules_select_own on public.rules;
create policy rules_select_own on public.rules
  for select using (auth.uid() = user_id);

drop policy if exists rules_insert_own on public.rules;
create policy rules_insert_own on public.rules
  for insert with check (auth.uid() = user_id);

drop policy if exists rules_update_own on public.rules;
create policy rules_update_own on public.rules
  for update using (auth.uid() = user_id);

drop policy if exists rules_delete_own on public.rules;
create policy rules_delete_own on public.rules
  for delete using (auth.uid() = user_id);
