-- Rename kind 'solution' to 'documentation' in rules table
-- This aligns the database with the CLI and webapp terminology change

-- Drop the old constraint first so the update can proceed
alter table public.rules drop constraint if exists rules_kind_check;

-- Update existing rows
update public.rules set kind = 'documentation' where kind = 'solution';

-- Add the new constraint
alter table public.rules add constraint rules_kind_check
  check (kind in ('rule', 'documentation', 'skill', 'command'));
