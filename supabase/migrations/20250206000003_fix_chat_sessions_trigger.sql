-- Fix chat_sessions trigger to allow explicit user_id
-- The trigger should only set user_id from auth.uid() if it's not already provided
-- This allows the Edge Function to pass user_id explicitly when JWT is disabled

create or replace function public.chat_sessions_set_user_id_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only set user_id from auth.uid() if it's not already provided
  -- This allows explicit user_id to be passed (e.g., from Edge Function with disabled JWT)
  if new.user_id is null then
    new.user_id = auth.uid();
  end if;
  return new;
end;
$$;
