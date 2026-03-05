import { fetchRulesByIds } from '../api/client.js';
import type { Rule, RuleKind } from '../types.js';
import type { InstalledItem } from './installed-scan.js';

export interface UpdatableItem {
  id: string;
  kind: RuleKind;
  title: string;
  currentVersion: string | null;
  availableVersion: string | null;
  path: string;
}

export interface GroupedUpdatable {
  rules: UpdatableItem[];
  skills: UpdatableItem[];
  commands: UpdatableItem[];
  solutions: UpdatableItem[];
}

export interface UpdateCheckResult {
  /** Items that have a newer version available (only differences). */
  grouped: GroupedUpdatable;
  /** Count of installed items that are already up to date. */
  upToDateCount: number;
  /** Total installed items considered (folder sink). */
  totalCount: number;
}

/**
 * Simple semver-style compare: returns 1 if a > b, -1 if a < b, 0 if equal.
 * Falls back to string comparison for non-numeric segments.
 */
function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((s) => s.replace(/\D.*$/, ''));
  const pb = b.split('.').map((s) => s.replace(/\D.*$/, ''));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? '0', 10);
    const nb = parseInt(pb[i] ?? '0', 10);
    if (na !== nb) return na > nb ? 1 : -1;
  }
  return 0;
}

function isNewerByVersion(
  currentVersion: string | null,
  availableVersion: string | null
): boolean {
  if (availableVersion == null || availableVersion === '') return false;
  if (currentVersion == null || currentVersion === '') return true;
  return compareVersion(availableVersion, currentVersion) > 0;
}

function isNewerByTime(remoteUpdatedAt: string, fileMtimeMs: number): boolean {
  return new Date(remoteUpdatedAt).getTime() > fileMtimeMs;
}

/**
 * Uses folder as sink: fetches from DB only the IDs present in installed list,
 * then computes which are up to date vs need update. Returns only the differences (to update) plus counts.
 */
export const getGroupedUpdatable = async (
  installed: InstalledItem[],
  options?: { kind?: RuleKind; projectId?: string | null }
): Promise<UpdateCheckResult> => {
  const kindFilter = options?.kind;
  const installedFiltered = kindFilter
    ? installed.filter((i) => i.kind === kindFilter)
    : installed;
  const ids = installedFiltered.map((i) => i.id);
  const remoteList = await fetchRulesByIds(ids);
  const byId = new Map<string, Rule>();
  for (const r of remoteList) {
    byId.set(r.id, r);
  }

  const grouped: GroupedUpdatable = {
    rules: [],
    skills: [],
    commands: [],
    solutions: [],
  };
  let upToDateCount = 0;

  for (const item of installedFiltered) {
    const remote = byId.get(item.id);
    if (!remote) continue;

    const availableVersion = remote.version ?? null;
    const hasNewerVersion =
      availableVersion != null && availableVersion !== ''
        ? isNewerByVersion(item.currentVersion, availableVersion)
        : isNewerByTime(remote.updated_at, item.mtimeMs);

    if (hasNewerVersion) {
      const entry: UpdatableItem = {
        id: item.id,
        kind: item.kind,
        title: remote.title,
        currentVersion: item.currentVersion,
        availableVersion,
        path: item.path,
      };
      const key: keyof GroupedUpdatable =
        item.kind === 'rule'
          ? 'rules'
          : item.kind === 'skill'
            ? 'skills'
            : item.kind === 'command'
              ? 'commands'
              : 'solutions';
      grouped[key].push(entry);
    } else {
      upToDateCount++;
    }
  }

  return {
    grouped,
    upToDateCount,
    totalCount: installedFiltered.length,
  };
}

/**
 * Flatten grouped updatable into a single list (for multi-select).
 */
export const flattenUpdatable = (grouped: GroupedUpdatable): UpdatableItem[] => {
  return [
    ...grouped.rules,
    ...grouped.skills,
    ...grouped.commands,
    ...grouped.solutions,
  ];
}
