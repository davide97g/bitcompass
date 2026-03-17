-- Add config JSONB column to compass_projects for sharing project configuration.
-- Members can read/write (same policies as existing project access).
ALTER TABLE compass_projects ADD COLUMN config jsonb DEFAULT '{}';
