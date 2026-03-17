-- Rules: public read for all, author visible
-- 1) Allow anyone to read all rules (public)
-- 2) Add author_display_name for showing who created the rule

alter table public.rules add column if not exists author_display_name text default '';

-- Drop the "own only" select policy and add a public select policy so all users can read all rules
drop policy if exists rules_select_own on public.rules;
create policy rules_select_all on public.rules
  for select using (true);

-- Keep insert/update/delete restricted to the owner
-- (rules_insert_own, rules_update_own, rules_delete_own already exist)
