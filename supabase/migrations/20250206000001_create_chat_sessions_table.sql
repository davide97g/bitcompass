-- Chat sessions table: tracks chat conversations
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);
create index if not exists chat_sessions_user_id_created_idx on public.chat_sessions (user_id, created_at desc);

alter table public.chat_sessions enable row level security;

create policy chat_sessions_select_own on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy chat_sessions_insert_own on public.chat_sessions
  for insert with check (auth.uid() = user_id);
create policy chat_sessions_update_own on public.chat_sessions
  for update using (auth.uid() = user_id);
create policy chat_sessions_delete_own on public.chat_sessions
  for delete using (auth.uid() = user_id);

create or replace function public.chat_sessions_set_user_id_on_insert()
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

drop trigger if exists chat_sessions_set_user_id_on_insert on public.chat_sessions;
create trigger chat_sessions_set_user_id_on_insert
  before insert on public.chat_sessions
  for each row
  execute function public.chat_sessions_set_user_id_on_insert();

-- updated_at trigger
drop trigger if exists chat_sessions_updated_at on public.chat_sessions;
create trigger chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();
