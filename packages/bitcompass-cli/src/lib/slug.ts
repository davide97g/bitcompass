/**
 * Converts a rule/solution title to a standardized filename slug.
 * e.g. "# Strava API Authentication Flow" -> "strava-api-authentication-flow"
 */
export const titleToSlug = (title: string): string => {
  const trimmed = (title ?? '').trim().replace(/^#\s*/, '');
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Returns the rule filename in Cursor .mdc format (e.g. strava-api-authentication-flow.mdc).
 * Falls back to id if slug is empty.
 */
export const ruleFilename = (title: string, id: string): string => {
  const base = titleToSlug(title) || id;
  return `${base}.mdc`;
};

/**
 * Returns the solution filename (e.g. strava-api-authentication-flow.md).
 * Falls back to id if slug is empty.
 */
export const solutionFilename = (title: string, id: string): string => {
  const base = titleToSlug(title) || id;
  return `${base}.md`;
};

/**
 * Returns the skill path as a subdirectory with SKILL.md (e.g. strava-api-authentication-flow/SKILL.md).
 * Falls back to id if slug is empty.
 */
export const skillFilename = (title: string, id: string): string => {
  const base = titleToSlug(title) || id;
  return `${base}/SKILL.md`;
};

/**
 * Returns the command filename (e.g. strava-api-authentication-flow.md).
 * Falls back to id if slug is empty.
 */
export const commandFilename = (title: string, id: string): string => {
  const base = titleToSlug(title) || id;
  return `${base}.md`;
};
