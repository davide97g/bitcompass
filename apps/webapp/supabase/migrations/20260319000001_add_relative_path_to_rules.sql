ALTER TABLE public.rules ADD COLUMN IF NOT EXISTS relative_path text;
COMMENT ON COLUMN public.rules.relative_path IS
  'Optional subdirectory relative to project root for monorepo scoping (e.g. packages/frontend)';
