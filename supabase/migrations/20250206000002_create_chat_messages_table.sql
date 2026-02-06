-- Chat messages table: stores individual messages in conversations
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_id_idx on public.chat_messages (user_id);
create index if not exists chat_messages_chat_id_idx on public.chat_messages (chat_id);
create index if not exists chat_messages_chat_id_created_idx on public.chat_messages (chat_id, created_at asc);

alter table public.chat_messages enable row level security;

create policy chat_messages_select_own on public.chat_messages
  for select using (auth.uid() = user_id);
create policy chat_messages_insert_own on public.chat_messages
  for insert with check (auth.uid() = user_id);
create policy chat_messages_update_own on public.chat_messages
  for update using (auth.uid() = user_id);
create policy chat_messages_delete_own on public.chat_messages
  for delete using (auth.uid() = user_id);

create or replace function public.chat_messages_set_user_id_on_insert()
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

drop trigger if exists chat_messages_set_user_id_on_insert on public.chat_messages;
create trigger chat_messages_set_user_id_on_insert
  before insert on public.chat_messages
  for each row
  execute function public.chat_messages_set_user_id_on_insert();
