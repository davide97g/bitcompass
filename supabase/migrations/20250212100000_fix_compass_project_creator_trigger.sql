-- Fix: ensure creator is always added as member (use auth.uid() if created_by is null)
-- and avoid null user_id insert which would violate NOT NULL
create or replace function public.compass_projects_add_creator_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := coalesce(new.created_by, auth.uid());
  if uid is not null then
    insert into public.compass_project_members (project_id, user_id)
    values (new.id, uid);
  end if;
  return new;
end;
$$;
