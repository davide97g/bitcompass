export interface Migration {
  /** Semver string — the version this migration upgrades TO */
  version: string;
  /** Human-readable description, shown in spinner */
  description: string;
  /** Determines which state tracker is checked */
  scope: 'global' | 'project';
  /** Performs the migration. Must be idempotent. Throws on failure. */
  migrate: (opts?: { dryRun?: boolean }) => Promise<void>;
}
