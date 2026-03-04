import { fetchRules } from '../api/client.js';
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
 * Fetches remote rules and computes which installed items have updates.
 * Optionally filter by kind.
 */
export const getGroupedUpdatable = async (
  installed: InstalledItem[],
  options?: { kind?: RuleKind }
): Promise<GroupedUpdatable> => {
  const remoteList = await fetchRules();
  const byId = new Map<string, Rule>();
  for (const r of remoteList) {
    byId.set(r.id, r);
  }

  const result: GroupedUpdatable = {
    rules: [],
    skills: [],
    commands: [],
    solutions: [],
  };

  const kindFilter = options?.kind;
  for (const item of installed) {
    if (kindFilter && item.kind !== kindFilter) continue;
    const remote = byId.get(item.id);
    if (!remote) continue;

    const availableVersion = remote.version ?? null;
    const hasNewerVersion =
      availableVersion != null && availableVersion !== ''
        ? isNewerByVersion(item.currentVersion, availableVersion)
        : isNewerByTime(remote.updated_at, item.mtimeMs);

    if (!hasNewerVersion) continue;

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
    result[key].push(entry);
  }

  return result;
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
