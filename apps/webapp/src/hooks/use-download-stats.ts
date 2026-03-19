import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RuleKind } from '@/types/bitcompass';

// ── Overview ────────────────────────────────────────────────────────────────

export interface DownloadOverview {
  total: number;
  uniqueEntities: number;
  uniqueUsers: number;
  last7d: number;
}

const fetchDownloadOverview = async (): Promise<DownloadOverview> => {
  if (!supabase) return { total: 0, uniqueEntities: 0, uniqueUsers: 0, last7d: 0 };
  const { data, error } = await supabase.from('downloads').select('rule_id, user_id, created_at');
  if (error) throw error;
  const rows = (data ?? []) as { rule_id: string; user_id: string; created_at: string }[];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    total: rows.length,
    uniqueEntities: new Set(rows.map((r) => r.rule_id)).size,
    uniqueUsers: new Set(rows.map((r) => r.user_id)).size,
    last7d: rows.filter((r) => r.created_at >= sevenDaysAgo).length,
  };
};

export const useDownloadOverview = () =>
  useQuery({
    queryKey: ['download-overview'],
    queryFn: fetchDownloadOverview,
    enabled: Boolean(supabase),
  });

// ── Per-rule download count ─────────────────────────────────────────────────

const fetchRuleDownloadCount = async (ruleId: string): Promise<number> => {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('downloads')
    .select('id', { count: 'exact', head: true })
    .eq('rule_id', ruleId);
  if (error) throw error;
  return count ?? 0;
};

export const useRuleDownloadCount = (ruleId: string | undefined) =>
  useQuery({
    queryKey: ['rule-download-count', ruleId],
    queryFn: () => fetchRuleDownloadCount(ruleId!),
    enabled: Boolean(supabase && ruleId),
  });

// ── Batch rule download counts ──────────────────────────────────────────────

const fetchRuleDownloadCounts = async (ruleIds: string[]): Promise<Record<string, number>> => {
  if (!supabase || ruleIds.length === 0) return {};
  const { data, error } = await supabase
    .from('downloads')
    .select('rule_id')
    .in('rule_id', ruleIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { rule_id: string }[]) {
    counts[row.rule_id] = (counts[row.rule_id] ?? 0) + 1;
  }
  return counts;
};

export const useRuleDownloadCounts = (ruleIds: string[]) =>
  useQuery({
    queryKey: ['rule-download-counts', ruleIds.slice().sort().join(',')],
    queryFn: () => fetchRuleDownloadCounts(ruleIds),
    enabled: Boolean(supabase && ruleIds.length > 0),
  });

// ── Top downloaded ──────────────────────────────────────────────────────────

export interface TopDownloadedItem {
  rule_id: string;
  count: number;
}

const fetchTopDownloaded = async (
  period: '7d' | '30d' | 'all',
  limit: number
): Promise<TopDownloadedItem[]> => {
  if (!supabase) return [];
  let query = supabase.from('downloads').select('rule_id, created_at');
  if (period !== 'all') {
    const days = period === '7d' ? 7 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }
  const { data, error } = await query;
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { rule_id: string }[]) {
    counts.set(row.rule_id, (counts.get(row.rule_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([rule_id, count]) => ({ rule_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

export const useTopDownloaded = (period: '7d' | '30d' | 'all' = '7d', limit = 10) =>
  useQuery({
    queryKey: ['top-downloaded', period, limit],
    queryFn: () => fetchTopDownloaded(period, limit),
    enabled: Boolean(supabase),
  });

// ── Download trends (time series) ──────────────────────────────────────────

export interface TrendPoint {
  date: string;
  count: number;
}

const fetchDownloadTrends = async (period: '7d' | '30d' | '90d'): Promise<TrendPoint[]> => {
  if (!supabase) return [];
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('downloads')
    .select('created_at')
    .gte('created_at', since);
  if (error) throw error;
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of (data ?? []) as { created_at: string }[]) {
    const day = row.created_at.slice(0, 10);
    if (buckets.has(day)) {
      buckets.set(day, buckets.get(day)! + 1);
    }
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
};

export const useDownloadTrends = (period: '7d' | '30d' | '90d' = '30d') =>
  useQuery({
    queryKey: ['download-trends', period],
    queryFn: () => fetchDownloadTrends(period),
    enabled: Boolean(supabase),
  });

// ── Editor distribution ─────────────────────────────────────────────────────

export interface EditorSlice {
  editor: string;
  count: number;
}

const fetchEditorDistribution = async (): Promise<EditorSlice[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('downloads').select('editor');
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { editor: string | null }[]) {
    const key = row.editor || 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([editor, count]) => ({ editor, count }))
    .sort((a, b) => b.count - a.count);
};

export const useEditorDistribution = () =>
  useQuery({
    queryKey: ['editor-distribution'],
    queryFn: fetchEditorDistribution,
    enabled: Boolean(supabase),
  });

// ── Project download stats ──────────────────────────────────────────────────

export interface ProjectDownloadStat {
  compass_project_id: string;
  count: number;
}

const fetchProjectDownloadStats = async (): Promise<ProjectDownloadStat[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('downloads')
    .select('compass_project_id')
    .not('compass_project_id', 'is', null);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { compass_project_id: string }[]) {
    counts.set(row.compass_project_id, (counts.get(row.compass_project_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([compass_project_id, count]) => ({ compass_project_id, count }))
    .sort((a, b) => b.count - a.count);
};

export const useProjectDownloadStats = () =>
  useQuery({
    queryKey: ['project-download-stats'],
    queryFn: fetchProjectDownloadStats,
    enabled: Boolean(supabase),
  });

// ── Top contributors (authors with most-downloaded content) ─────────────────

export interface TopContributor {
  user_id: string;
  downloads: number;
}

const fetchTopContributors = async (limit: number): Promise<TopContributor[]> => {
  if (!supabase) return [];
  const [downloadsRes, rulesRes] = await Promise.all([
    supabase.from('downloads').select('rule_id'),
    supabase.from('rules').select('id, user_id'),
  ]);
  if (downloadsRes.error) throw downloadsRes.error;
  if (rulesRes.error) throw rulesRes.error;
  const ruleAuthor = new Map<string, string>();
  for (const rule of (rulesRes.data ?? []) as { id: string; user_id: string }[]) {
    ruleAuthor.set(rule.id, rule.user_id);
  }
  const authorDownloads = new Map<string, number>();
  for (const dl of (downloadsRes.data ?? []) as { rule_id: string }[]) {
    const author = ruleAuthor.get(dl.rule_id);
    if (author) {
      authorDownloads.set(author, (authorDownloads.get(author) ?? 0) + 1);
    }
  }
  return [...authorDownloads.entries()]
    .map(([user_id, downloads]) => ({ user_id, downloads }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit);
};

export const useTopContributors = (limit = 10) =>
  useQuery({
    queryKey: ['top-contributors', limit],
    queryFn: () => fetchTopContributors(limit),
    enabled: Boolean(supabase),
  });

// ── Kind breakdown ──────────────────────────────────────────────────────────

export interface KindSlice {
  kind: RuleKind;
  count: number;
}

const fetchKindBreakdown = async (): Promise<KindSlice[]> => {
  if (!supabase) return [];
  const [downloadsRes, rulesRes] = await Promise.all([
    supabase.from('downloads').select('rule_id'),
    supabase.from('rules').select('id, kind'),
  ]);
  if (downloadsRes.error) throw downloadsRes.error;
  if (rulesRes.error) throw rulesRes.error;
  const ruleKind = new Map<string, RuleKind>();
  for (const rule of (rulesRes.data ?? []) as { id: string; kind: RuleKind }[]) {
    ruleKind.set(rule.id, rule.kind);
  }
  const counts = new Map<RuleKind, number>();
  for (const dl of (downloadsRes.data ?? []) as { rule_id: string }[]) {
    const kind = ruleKind.get(dl.rule_id);
    if (kind) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
};

export const useKindBreakdown = () =>
  useQuery({
    queryKey: ['kind-breakdown'],
    queryFn: fetchKindBreakdown,
    enabled: Boolean(supabase),
  });

// ── Source breakdown ────────────────────────────────────────────────────────

export interface SourceSlice {
  source: string;
  count: number;
}

const fetchSourceBreakdown = async (): Promise<SourceSlice[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('downloads').select('source');
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { source: string }[]) {
    const key = row.source || 'cli';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
};

export const useSourceBreakdown = () =>
  useQuery({
    queryKey: ['source-breakdown'],
    queryFn: fetchSourceBreakdown,
    enabled: Boolean(supabase),
  });

// ── User downloads received (for UserDetailPage) ────────────────────────────

const fetchUserDownloadsReceived = async (userId: string): Promise<number> => {
  if (!supabase) return 0;
  const { data: rules, error: rulesError } = await supabase
    .from('rules')
    .select('id')
    .eq('user_id', userId);
  if (rulesError) throw rulesError;
  const ruleIds = (rules ?? []).map((r: { id: string }) => r.id);
  if (ruleIds.length === 0) return 0;
  const { count, error } = await supabase
    .from('downloads')
    .select('id', { count: 'exact', head: true })
    .in('rule_id', ruleIds);
  if (error) throw error;
  return count ?? 0;
};

export const useUserDownloadsReceived = (userId: string | undefined) =>
  useQuery({
    queryKey: ['user-downloads-received', userId],
    queryFn: () => fetchUserDownloadsReceived(userId!),
    enabled: Boolean(supabase && userId),
  });

// ── Project download total (for CompassProjectDetailPage) ───────────────────

const fetchProjectDownloadTotal = async (projectId: string): Promise<number> => {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('downloads')
    .select('id', { count: 'exact', head: true })
    .eq('compass_project_id', projectId);
  if (error) throw error;
  return count ?? 0;
};

export const useProjectDownloadTotal = (projectId: string | undefined) =>
  useQuery({
    queryKey: ['project-download-total', projectId],
    queryFn: () => fetchProjectDownloadTotal(projectId!),
    enabled: Boolean(supabase && projectId),
  });
