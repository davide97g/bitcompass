-- Add visibility column to rules: 'private' (default, only owner sees) or 'public' (everyone sees)
alter table public.rules
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

create index if not exists rules_visibility_idx on public.rules (visibility);
