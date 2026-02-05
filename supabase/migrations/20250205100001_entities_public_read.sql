-- Make problems, projects, and automations publicly readable (for MCP and app).
-- Insert/update/delete remain owner-only.

-- Problems: public select
drop policy if exists problems_select_own on public.problems;
create policy problems_select_all on public.problems
  for select using (true);

-- Projects: public select
drop policy if exists projects_select_own on public.projects;
create policy projects_select_all on public.projects
  for select using (true);

-- Automations: public select
drop policy if exists automations_select_own on public.automations;
create policy automations_select_all on public.automations
  for select using (true);
