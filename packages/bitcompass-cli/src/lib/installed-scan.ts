import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import {
  getProjectConfig,
  getOutputDirForKind,
  getOutputDirsForKind,
  getGlobalOutputDirForKind,
  KIND_SUBFOLDERS,
  SPECIAL_FILE_TARGETS,
} from '../auth/project-config.js';
import { parseRuleMdcContent } from './mdc-format.js';
import type { RuleKind } from '../types.js';

export interface InstalledItem {
  id: string;
  kind: RuleKind;
  currentVersion: string | null;
  path: string;
  /** File mtime in ms (for fallback when version is missing). */
  mtimeMs: number;
}

const EXT_BY_KIND: Record<RuleKind, string[]> = {
  rule: ['.mdc'],
  skill: ['.md'],
  command: ['.md'],
  solution: ['.md'],
};

/**
 * Scans a directory for installed items with frontmatter IDs.
 * For skills, also scans one level of subdirectories for SKILL.md files.
 */
const scanDir = (dir: string, kind: RuleKind, exts: string[]): InstalledItem[] => {
  const items: InstalledItem[] = [];
  if (!existsSync(dir)) return items;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    // Scan flat files
    for (const entry of entries) {
      if ((entry.isFile() || entry.isSymbolicLink()) && exts.some((ext) => String(entry.name).endsWith(ext))) {
        const item = tryParseItem(join(dir, String(entry.name)), kind);
        if (item) items.push(item);
      }
    }
    // For skills, also scan one level of subdirectories for SKILL.md
    if (kind === 'skill') {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillMd = join(dir, String(entry.name), 'SKILL.md');
          const item = tryParseItem(skillMd, kind);
          if (item) items.push(item);
        }
      }
    }
  } catch {
    return items;
  }

  return items;
};

const tryParseItem = (path: string, kind: RuleKind): InstalledItem | null => {
  let raw: string;
  let mtimeMs = 0;
  try {
    raw = readFileSync(path, 'utf-8');
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    return null;
  }
  const parsed = parseRuleMdcContent(raw);
  if (!parsed?.id) return null;
  return {
    id: parsed.id,
    kind,
    currentVersion: parsed.version ?? null,
    path,
    mtimeMs,
  };
};

/**
 * Scans project or global output dirs for installed rules/skills/commands/solutions.
 * Scans all configured editor paths (not just the primary one).
 * Also scans known special file paths.
 * Only includes files that have `id` in frontmatter (so they can be matched to remote for updates).
 */
export const scanInstalled = (options: { global?: boolean }): InstalledItem[] => {
  const result: InstalledItem[] = [];
  const seenIds = new Set<string>();
  const config = getProjectConfig({ warnIfMissing: false });
  const kinds = Object.keys(KIND_SUBFOLDERS) as RuleKind[];

  for (const kind of kinds) {
    let dirs: string[];
    if (options.global) {
      dirs = [getGlobalOutputDirForKind(kind)];
    } else {
      dirs = getOutputDirsForKind(config, kind);
    }

    for (const dir of dirs) {
      const exts = EXT_BY_KIND[kind];
      const items = scanDir(dir, kind, exts);
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          result.push(item);
        }
      }
    }
  }

  // Scan special file paths
  if (!options.global) {
    const cwd = process.cwd();
    for (const target of Object.values(SPECIAL_FILE_TARGETS)) {
      const filePath = join(cwd, target.path);
      // Special files may not have frontmatter, but try to parse if they do
      const item = tryParseItem(filePath, 'rule');
      if (item && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        result.push(item);
      }
    }
  }

  return result;
};
