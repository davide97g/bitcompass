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
 * Extracts the first 8 characters of an ID for use as a short unique suffix.
 * UUIDs have enough entropy in the first 8 hex chars to avoid collisions.
 */
const shortId = (id: string): string => id.slice(0, 8);

/**
 * Returns the rule filename in Cursor .mdc format (e.g. strava-api-authentication-flow-abc12345.mdc).
 * Includes a short ID suffix to prevent collisions when two rules share the same title.
 * Falls back to id if slug is empty.
 */
export const ruleFilename = (title: string, id: string): string => {
  const slug = titleToSlug(title);
  if (!slug) return `${id}.mdc`;
  return `${slug}-${shortId(id)}.mdc`;
};

/**
 * Returns the solution filename (e.g. strava-api-authentication-flow-abc12345.md).
 * Includes a short ID suffix to prevent collisions.
 * Falls back to id if slug is empty.
 */
export const solutionFilename = (title: string, id: string): string => {
  const slug = titleToSlug(title);
  if (!slug) return `${id}.md`;
  return `${slug}-${shortId(id)}.md`;
};

/**
 * Returns the skill path as a subdirectory with SKILL.md (e.g. strava-api-authentication-flow-abc12345/SKILL.md).
 * Includes a short ID suffix to prevent collisions.
 * Falls back to id if slug is empty.
 */
export const skillFilename = (title: string, id: string): string => {
  const slug = titleToSlug(title);
  if (!slug) return `${id}/SKILL.md`;
  return `${slug}-${shortId(id)}/SKILL.md`;
};

/**
 * Returns the command filename (e.g. strava-api-authentication-flow-abc12345.md).
 * Includes a short ID suffix to prevent collisions.
 * Falls back to id if slug is empty.
 */
export const commandFilename = (title: string, id: string): string => {
  const slug = titleToSlug(title);
  if (!slug) return `${id}.md`;
  return `${slug}-${shortId(id)}.md`;
};
