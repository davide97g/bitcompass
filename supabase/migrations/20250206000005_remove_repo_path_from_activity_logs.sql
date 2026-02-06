-- Remove repo_path from all existing activity logs
-- This is a destructive operation that permanently removes path information
update public.activity_logs
set repo_summary = repo_summary - 'repo_path'
where repo_summary ? 'repo_path';
