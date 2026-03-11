import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import {
  getProjectConfig,
  getOutputDirForKind,
  getGlobalOutputDirForKind,
  KIND_SUBFOLDERS,
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
 * Scans project or global output dirs for installed rules/skills/commands/solutions.
 * Only includes files that have `id` in frontmatter (so they can be matched to remote for updates).
 */
export const scanInstalled = (options: { global?: boolean }): InstalledItem[] => {
  const result: InstalledItem[] = [];
  const config = getProjectConfig({ warnIfMissing: false });
  const kinds = Object.keys(KIND_SUBFOLDERS) as RuleKind[];

  for (const kind of kinds) {
    const dir = options.global
      ? getGlobalOutputDirForKind(kind)
      : getOutputDirForKind(config, kind);
    if (!existsSync(dir)) continue;

    const exts = EXT_BY_KIND[kind];
    let entries: string[];
    try {
      entries = readdirSync(dir, { withFileTypes: true })
        .filter((e) => (e.isFile() || e.isSymbolicLink()) && exts.some((ext) => e.name.endsWith(ext)))
        .map((e) => e.name);
    } catch {
      continue;
    }

    for (const name of entries) {
      const path = join(dir, name);
      let raw: string;
      let mtimeMs = 0;
      try {
        raw = readFileSync(path, 'utf-8');
        mtimeMs = statSync(path).mtimeMs;
      } catch {
        continue;
      }
      const parsed = parseRuleMdcContent(raw);
      if (!parsed?.id) continue;
      result.push({
        id: parsed.id,
        kind,
        currentVersion: parsed.version ?? null,
        path,
        mtimeMs,
      });
    }
  }

  return result;
}

