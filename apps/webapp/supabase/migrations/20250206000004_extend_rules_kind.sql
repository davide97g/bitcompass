-- Extend rules.kind CHECK constraint to include 'skill' and 'command'
-- This allows the rules table to store all four entity types: rules, solutions, skills, and commands

-- Drop the existing constraint
alter table public.rules drop constraint if exists rules_kind_check;

-- Add the new constraint with all four kinds
alter table public.rules add constraint rules_kind_check 
  check (kind in ('rule', 'solution', 'skill', 'command'));
