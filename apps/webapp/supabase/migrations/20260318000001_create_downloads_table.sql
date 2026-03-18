CREATE TABLE downloads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id uuid NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  editor text,
  compass_project_id uuid,
  source text DEFAULT 'cli',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_downloads_rule_id ON downloads(rule_id);
CREATE INDEX idx_downloads_user_id ON downloads(user_id);
CREATE INDEX idx_downloads_created_at ON downloads(created_at);
CREATE INDEX idx_downloads_compass_project ON downloads(compass_project_id) WHERE compass_project_id IS NOT NULL;

ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own downloads" ON downloads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read downloads" ON downloads FOR SELECT USING (true);
