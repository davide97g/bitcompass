-- Compass projects: scoping entity for rules/skills/commands (title, description, members)
create table if not exists public.compass_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compass_projects_created_at_idx on public.compass_projects (created_at desc);

-- updated_at trigger
drop trigger if exists compass_projects_updated_at on public.compass_projects;
create trigger compass_projects_updated_at
  before update on public.compass_projects
  for each row execute function public.set_updated_at();

-- Members: who is in each project (creator is added by trigger)
create table if not exists public.compass_project_members (
  project_id uuid not null references public.compass_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (project_id, user_id)
);

create index if not exists compass_project_members_user_id_idx on public.compass_project_members (user_id);

-- BEFORE INSERT: set created_by and updated_at
create or replace function public.compass_projects_set_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists compass_projects_set_created_by on public.compass_projects;
create trigger compass_projects_set_created_by
  before insert on public.compass_projects
  for each row execute function public.compass_projects_set_created_by();

-- AFTER INSERT: add creator as first member
create or replace function public.compass_projects_add_creator_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.compass_project_members (project_id, user_id)
  values (new.id, new.created_by);
  return new;
end;
$$;

drop trigger if exists compass_projects_add_creator_member on public.compass_projects;
create trigger compass_projects_add_creator_member
  after insert on public.compass_projects
  for each row execute function public.compass_projects_add_creator_member();

-- RLS: compass_projects
alter table public.compass_projects enable row level security;

-- SELECT: user can see project if they are a member
create policy compass_projects_select_member on public.compass_projects
  for select to authenticated
  using (
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = compass_projects.id and cpm.user_id = auth.uid()
    )
  );

-- INSERT: any authenticated user can create a project (trigger adds them as member)
create policy compass_projects_insert_authenticated on public.compass_projects
  for insert to authenticated
  with check (true);

-- UPDATE/DELETE: only members can update or delete the project
create policy compass_projects_update_member on public.compass_projects
  for update to authenticated
  using (
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = compass_projects.id and cpm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = compass_projects.id and cpm.user_id = auth.uid()
    )
  );

create policy compass_projects_delete_member on public.compass_projects
  for delete to authenticated
  using (
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = compass_projects.id and cpm.user_id = auth.uid()
    )
  );

-- RLS: compass_project_members
alter table public.compass_project_members enable row level security;

-- SELECT: members can see the member list
create policy compass_project_members_select_member on public.compass_project_members
  for select to authenticated
  using (
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = compass_project_members.project_id and cpm.user_id = auth.uid()
    )
  );

-- INSERT: members can add new members (trigger adds creator, so first insert is from trigger with definer)
create policy compass_project_members_insert_member on public.compass_project_members
  for insert to authenticated
  with check (
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = compass_project_members.project_id and cpm.user_id = auth.uid()
    )
  );

-- DELETE: members can remove any member (including themselves for "leave")
create policy compass_project_members_delete_member on public.compass_project_members
  for delete to authenticated
  using (
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = compass_project_members.project_id and cpm.user_id = auth.uid()
    )
  );