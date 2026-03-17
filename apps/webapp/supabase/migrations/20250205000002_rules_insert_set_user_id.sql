-- Ensure inserts into public.rules always have user_id set to the authenticated user.
-- This satisfies RLS (auth.uid() = user_id) when the client omits user_id (e.g. MCP post-rules).

create or replace function public.rules_set_user_id_on_insert()
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

drop trigger if exists rules_set_user_id_on_insert on public.rules;
create trigger rules_set_user_id_on_insert
  before insert on public.rules
  for each row
  execute function public.rules_set_user_id_on_insert();
