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
