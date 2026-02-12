-- Add project scoping to rules: project_id references compass_projects
alter table public.rules
  add column if not exists project_id uuid references public.compass_projects(id) on delete set null;

create index if not exists rules_project_id_idx on public.rules (project_id);

-- Replace RLS policies: visibility and writes based on project membership

-- SELECT: user sees rule if project_id is null (global) OR user is member of the project
drop policy if exists rules_select_all on public.rules;
create policy rules_select_scoped on public.rules
  for select
  using (
    (project_id is null)
    or
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = rules.project_id and cpm.user_id = auth.uid()
    )
  );

-- INSERT: user can insert if project_id is null OR user is member of that project
drop policy if exists rules_insert_own on public.rules;
create policy rules_insert_scoped on public.rules
  for insert
  with check (
    (project_id is null)
    or
    exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = rules.project_id and cpm.user_id = auth.uid()
    )
  );

-- UPDATE: owner OR project member can update
drop policy if exists rules_update_own on public.rules;
create policy rules_update_scoped on public.rules
  for update
  using (
    (user_id = auth.uid())
    or
    (project_id is not null and exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = rules.project_id and cpm.user_id = auth.uid()
    ))
  )
  with check (
    (user_id = auth.uid())
    or
    (project_id is not null and exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = rules.project_id and cpm.user_id = auth.uid()
    ))
  );

-- DELETE: owner OR project member can delete
drop policy if exists rules_delete_own on public.rules;
create policy rules_delete_scoped on public.rules
  for delete
  using (
    (user_id = auth.uid())
    or
    (project_id is not null and exists (
      select 1 from public.compass_project_members cpm
      where cpm.project_id = rules.project_id and cpm.user_id = auth.uid()
    ))
  );
