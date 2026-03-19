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
