/**
 * Bumps the major version (e.g. 1.0.0 → 2.0.0).
 * Used when modifying a rule so the new version is greater.
 * Returns "1.0.0" when version is missing or invalid.
 */
export function bumpRuleVersionMajor(version?: string | null): string {
  const v = typeof version === 'string' ? version.trim() : '';
  if (!v) return '1.0.0';
  const parts = v.split('.');
  const major = parseInt(parts[0], 10);
  if (Number.isNaN(major) || major < 0) return '1.0.0';
  return `${major + 1}.0.0`;
}
