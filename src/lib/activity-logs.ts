/**
 * Supabase data access for activity logs (private, user-scoped).
 */

import { supabase } from '@/lib/supabase';
import type { ActivityLog, ActivityLogRow } from '@/types/entities';

const activityLogRowToApp = (row: ActivityLogRow): ActivityLog => ({
  id: row.id,
  timeFrame: row.time_frame,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  repoSummary: row.repo_summary ?? {},
  gitAnalysis: row.git_analysis ?? {},
  createdAt: row.created_at,
});

export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => activityLogRowToApp(row as ActivityLogRow));
};

export interface FetchActivityLogsPaginatedOptions {
  limit: number;
  offset: number;
}

export const fetchActivityLogsPaginated = async (
  options: FetchActivityLogsPaginatedOptions
): Promise<{ data: ActivityLog[]; total: number }> => {
  if (!supabase) return { data: [], total: 0 };
  const { limit, offset } = options;
  const { data, error, count } = await supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const list = (data ?? []).map((row) => activityLogRowToApp(row as ActivityLogRow));
  return { data: list, total: count ?? 0 };
};

export const fetchActivityLogById = async (id: string): Promise<ActivityLog | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? activityLogRowToApp(data as ActivityLogRow) : null;
};
