-- Rule groups: lightweight curated collections of rules
create table if not exists public.rule_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  parent_id uuid references public.rule_groups(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rule_groups_parent on public.rule_groups(parent_id);
create index idx_rule_groups_user on public.rule_groups(user_id);

-- updated_at trigger (reuses existing function)
drop trigger if exists rule_groups_updated_at on public.rule_groups;
create trigger rule_groups_updated_at
  before update on public.rule_groups
  for each row execute function public.set_updated_at();

-- Join table: many-to-many between groups and rules
create table if not exists public.rule_group_items (
  group_id uuid not null references public.rule_groups(id) on delete cascade,
  rule_id uuid not null references public.rules(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, rule_id)
);

create index idx_rule_group_items_rule on public.rule_group_items(rule_id);

-- RLS: rule_groups
alter table public.rule_groups enable row level security;

create policy "Groups are readable by all" on public.rule_groups
  for select to authenticated using (true);

create policy "Owner can insert groups" on public.rule_groups
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Owner can update groups" on public.rule_groups
  for update to authenticated
  using (auth.uid() = user_id);

create policy "Owner can delete groups" on public.rule_groups
  for delete to authenticated
  using (auth.uid() = user_id);

-- RLS: rule_group_items
alter table public.rule_group_items enable row level security;

create policy "Group items readable by all" on public.rule_group_items
  for select to authenticated using (true);

create policy "Group owner can add items" on public.rule_group_items
  for insert to authenticated
  with check (
    exists (select 1 from public.rule_groups where id = group_id and user_id = auth.uid())
  );

create policy "Group owner can remove items" on public.rule_group_items
  for delete to authenticated
  using (
    exists (select 1 from public.rule_groups where id = group_id and user_id = auth.uid())
  );

-- Recursive function to get all rule IDs in a group (including sub-groups)
create or replace function public.get_group_rule_ids(root_group_id uuid)
returns setof uuid as $$
  with recursive group_tree as (
    select id from public.rule_groups where id = root_group_id
    union all
    select rg.id from public.rule_groups rg
    join group_tree gt on rg.parent_id = gt.id
  )
  select distinct rgi.rule_id
  from public.rule_group_items rgi
  join group_tree gt on rgi.group_id = gt.id;
$$ language sql security definer set search_path = public;
