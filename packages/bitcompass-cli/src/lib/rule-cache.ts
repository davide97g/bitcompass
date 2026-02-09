import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from '../auth/config.js';
import { getRuleById } from '../api/client.js';
import { ruleFilename, solutionFilename, skillFilename, commandFilename } from './slug.js';
import { buildRuleMdcContent } from './mdc-format.js';
import type { Rule } from '../types.js';

/**
 * Gets the cache directory for rules (~/.bitcompass/cache/rules/)
 */
export const getCacheDir = (): string => {
  const cacheDir = join(getConfigDir(), 'cache', 'rules');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { mode: 0o755, recursive: true });
  }
  return cacheDir;
};

/**
 * Gets the cached file path for a rule by ID (rules use .mdc, others use .md)
 */
export const getCachedRulePath = (rule: Rule): string => {
  const cacheDir = getCacheDir();
  const filename =
    rule.kind === 'solution'
      ? solutionFilename(rule.title, rule.id)
      : rule.kind === 'skill'
        ? skillFilename(rule.title, rule.id)
        : rule.kind === 'command'
          ? commandFilename(rule.title, rule.id)
          : ruleFilename(rule.title, rule.id);
  return join(cacheDir, `${rule.id}-${filename}`);
};

/**
 * Ensures a rule is cached. Downloads and caches it if not present or outdated.
 * Returns the path to the cached file. Rules are stored as .mdc with Cursor frontmatter.
 */
export const ensureRuleCached = async (id: string): Promise<string> => {
  const rule = await getRuleById(id);
  if (!rule) {
    throw new Error(`Rule or solution with ID ${id} not found.`);
  }

  const cachedPath = getCachedRulePath(rule);
  const needsUpdate = !existsSync(cachedPath) || isCacheOutdated(cachedPath, rule);

  if (needsUpdate) {
    const content =
      rule.kind === 'rule'
        ? buildRuleMdcContent(rule)
        : rule.kind === 'solution'
          ? `# ${rule.title}\n\n${rule.description}\n\n## Solution\n\n${rule.body}\n`
          : `# ${rule.title}\n\n${rule.description}\n\n${rule.body}\n`;

    writeFileSync(cachedPath, content, 'utf-8');
  }

  return cachedPath;
};

/**
 * Checks if the cached file is outdated compared to the rule's updated_at timestamp
 */
const isCacheOutdated = (cachedPath: string, rule: Rule): boolean => {
  try {
    const stats = statSync(cachedPath);
    const cacheTime = stats.mtime.getTime();
    const ruleTime = new Date(rule.updated_at).getTime();
    return ruleTime > cacheTime;
  } catch {
    return true; // If we can't read the file, consider it outdated
  }
};
