-- Trigger function for pull notifications (downloads table)
create or replace function public.notify_on_download()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_title text;
  v_project_id uuid;
  v_project_name text;
  v_actor_name text;
  v_watcher_id uuid;
begin
  -- Fetch rule info
  select r.title, r.project_id
    into v_rule_title, v_project_id
    from public.rules r
    where r.id = NEW.rule_id;

  if v_rule_title is null then
    return NEW;
  end if;

  -- Fetch project name if applicable
  if v_project_id is not null then
    select cp.title into v_project_name
      from public.compass_projects cp
      where cp.id = v_project_id;
  end if;

  -- Fetch actor display name
  select coalesce(p.full_name, p.email, 'Unknown')
    into v_actor_name
    from public.profiles p
    where p.id = NEW.user_id;

  if v_actor_name is null then
    v_actor_name := 'Unknown';
  end if;

  -- Insert notification for each watcher (rule watchers + project members), excluding actor
  for v_watcher_id in
    select distinct w.user_id
    from (
      -- Users watching this rule
      select rw.user_id from public.rule_watches rw where rw.rule_id = NEW.rule_id
      union
      -- Members of the rule's project
      select cpm.user_id from public.compass_project_members cpm where cpm.project_id = v_project_id and v_project_id is not null
    ) w
    where w.user_id <> NEW.user_id
  loop
    insert into public.notifications (user_id, type, rule_id, rule_title, compass_project_id, project_name, actor_id, actor_name)
    values (v_watcher_id, 'pull', NEW.rule_id, v_rule_title, v_project_id, v_project_name, NEW.user_id, v_actor_name);
  end loop;

  return NEW;
end;
$$;

-- Trigger function for push notifications (rules table)
create or replace function public.notify_on_rule_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
  v_actor_id uuid;
  v_actor_name text;
  v_watcher_id uuid;
begin
  -- Guard: on UPDATE, only fire when version changes
  if TG_OP = 'UPDATE' and NEW.version is not distinct from OLD.version then
    return NEW;
  end if;

  -- Determine actor
  v_actor_id := coalesce(NEW.updated_by, NEW.user_id);

  -- Fetch project name if applicable
  if NEW.project_id is not null then
    select cp.title into v_project_name
      from public.compass_projects cp
      where cp.id = NEW.project_id;
  end if;

  -- Fetch actor display name
  select coalesce(p.full_name, p.email, 'Unknown')
    into v_actor_name
    from public.profiles p
    where p.id = v_actor_id;

  if v_actor_name is null then
    v_actor_name := 'Unknown';
  end if;

  -- Insert notification for each watcher, excluding actor
  for v_watcher_id in
    select distinct w.user_id
    from (
      select rw.user_id from public.rule_watches rw where rw.rule_id = NEW.id
      union
      select cpm.user_id from public.compass_project_members cpm where cpm.project_id = NEW.project_id and NEW.project_id is not null
    ) w
    where w.user_id <> v_actor_id
  loop
    insert into public.notifications (user_id, type, rule_id, rule_title, compass_project_id, project_name, actor_id, actor_name)
    values (v_watcher_id, 'push', NEW.id, NEW.title, NEW.project_id, v_project_name, v_actor_id, v_actor_name);
  end loop;

  return NEW;
end;
$$;

-- Create triggers
create trigger after_download_insert
  after insert on public.downloads
  for each row execute function public.notify_on_download();

create trigger after_rule_upsert
  after insert or update on public.rules
  for each row execute function public.notify_on_rule_push();
