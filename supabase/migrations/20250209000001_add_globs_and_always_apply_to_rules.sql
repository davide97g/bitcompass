-- Add Cursor rule frontmatter fields: globs (file patterns) and always_apply
-- Used when rules are saved as .mdc with YAML frontmatter

alter table public.rules
  add column if not exists globs text,
  add column if not exists always_apply boolean not null default false;

comment on column public.rules.globs is 'Optional glob patterns for when the rule applies (e.g. "*.ts, *.tsx")';
comment on column public.rules.always_apply is 'If true, Cursor applies this rule globally; default false';
