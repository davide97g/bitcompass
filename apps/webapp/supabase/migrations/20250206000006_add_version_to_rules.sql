-- Add version field to rules table
-- Version follows semantic versioning (e.g., "1.0.0", "2.1.3")
-- Defaults to "1.0.0" for existing rules

alter table public.rules add column if not exists version text default '1.0.0';

-- Create index for version lookups
create index if not exists rules_version_idx on public.rules (version);
