-- Remove all RLS from the tables added/updated for Compass projects and scoped rules.
-- After this migration, access is controlled only by Supabase anon/service role (no per-row checks).

-- profiles
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
alter table public.profiles disable row level security;

-- compass_projects
drop policy if exists compass_projects_select_member on public.compass_projects;
drop policy if exists compass_projects_insert_authenticated on public.compass_projects;
drop policy if exists compass_projects_update_member on public.compass_projects;
drop policy if exists compass_projects_delete_member on public.compass_projects;
alter table public.compass_projects disable row level security;

-- compass_project_members
drop policy if exists compass_project_members_select_member on public.compass_project_members;
drop policy if exists compass_project_members_insert_member on public.compass_project_members;
drop policy if exists compass_project_members_delete_member on public.compass_project_members;
alter table public.compass_project_members disable row level security;

-- rules (scoped policies we added)
drop policy if exists rules_select_scoped on public.rules;
drop policy if exists rules_insert_scoped on public.rules;
drop policy if exists rules_update_scoped on public.rules;
drop policy if exists rules_delete_scoped on public.rules;
alter table public.rules disable row level security;
