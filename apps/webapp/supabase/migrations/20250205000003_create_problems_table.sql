-- Problems table: user-created problems (seed data remains in frontend, merged in hooks)
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null check (status in ('open', 'solved', 'in-progress')),
  description text not null default '',
  solution text,
  technologies text[] default '{}',
  related_projects text[] default '{}',
  related_people text[] default '{}',
  created_at timestamptz not null default now(),
  solved_at date
);

create index if not exists problems_user_id_idx on public.problems (user_id);
create index if not exists problems_user_id_created_idx on public.problems (user_id, created_at desc);

alter table public.problems enable row level security;

create policy problems_select_own on public.problems
  for select using (auth.uid() = user_id);
create policy problems_insert_own on public.problems
  for insert with check (auth.uid() = user_id);
create policy problems_update_own on public.problems
  for update using (auth.uid() = user_id);
create policy problems_delete_own on public.problems
  for delete using (auth.uid() = user_id);

create or replace function public.problems_set_user_id_on_insert()
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

drop trigger if exists problems_set_user_id_on_insert on public.problems;
create trigger problems_set_user_id_on_insert
  before insert on public.problems
  for each row
  execute function public.problems_set_user_id_on_insert();
