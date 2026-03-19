import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import {
  getProjectConfig,
  getProjectRoot,
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

export interface UntrackedItem {
  kind: RuleKind;
  title: string;
  version: string | null;
  path: string;
  mtimeMs: number;
}

const EXT_BY_KIND: Record<RuleKind, string[]> = {
  rule: ['.mdc'],
  skill: ['.md'],
  command: ['.md'],
  documentation: ['.md'],
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
 * Scans project or global output dirs for installed rules/skills/commands/docs.
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
    const cwd = getProjectRoot();
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

/**
 * Tries to parse a file as an untracked item (no `id` in frontmatter).
 * Returns null if the file has an id or can't be read.
 */
const tryParseUntracked = (path: string, kind: RuleKind): UntrackedItem | null => {
  let raw: string;
  let mtimeMs = 0;
  try {
    raw = readFileSync(path, 'utf-8');
    mtimeMs = statSync(path).mtimeMs;
  } catch {
    return null;
  }
  const parsed = parseRuleMdcContent(raw);
  // If it has an id, it's tracked — skip
  if (parsed?.id) return null;
  // Extract title from first heading or filename
  const lines = raw.split('\n');
  let title = '';
  for (const line of lines) {
    const heading = line.match(/^#\s+(.+)/);
    if (heading) {
      title = heading[1].trim();
      break;
    }
  }
  if (!title) {
    title = path.split('/').pop()?.replace(/\.(mdc|md)$/, '') ?? 'Untitled';
  }
  return {
    kind,
    title,
    version: parsed?.version ?? null,
    path,
    mtimeMs,
  };
};

/**
 * Scans a directory for untracked items (files without `id` in frontmatter).
 */
const scanDirUntracked = (dir: string, kind: RuleKind, exts: string[]): UntrackedItem[] => {
  const items: UntrackedItem[] = [];
  if (!existsSync(dir)) return items;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if ((entry.isFile() || entry.isSymbolicLink()) && exts.some((ext) => String(entry.name).endsWith(ext))) {
        const item = tryParseUntracked(join(dir, String(entry.name)), kind);
        if (item) items.push(item);
      }
    }
    if (kind === 'skill') {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillMd = join(dir, String(entry.name), 'SKILL.md');
          const item = tryParseUntracked(skillMd, kind);
          if (item) items.push(item);
        }
      }
    }
  } catch {
    return items;
  }
  return items;
};

/**
 * Scans project or global output dirs for untracked files (no `id` in frontmatter).
 * These are candidates for `push-new` during bidirectional sync.
 */
export const scanUntracked = (options: { global?: boolean }): UntrackedItem[] => {
  const result: UntrackedItem[] = [];
  const seenPaths = new Set<string>();
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
      const items = scanDirUntracked(dir, kind, exts);
      for (const item of items) {
        if (!seenPaths.has(item.path)) {
          seenPaths.add(item.path);
          result.push(item);
        }
      }
    }
  }

  return result;
};
