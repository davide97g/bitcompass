-- Add updated_by to track who last modified a rule (for push notification attribution)
alter table public.rules
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
