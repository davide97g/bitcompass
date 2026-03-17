-- Add special_file_target column to rules table.
-- When set, the rule is written to a special output path (e.g. CLAUDE.md, .cursorrules)
-- instead of the kind-based directory.
ALTER TABLE rules ADD COLUMN special_file_target text DEFAULT NULL;
