import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig, loadCredentials } from '../auth/config.js';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from '../auth/defaults.js';
import type { ActivityLog, ActivityLogInsert, Rule, RuleInsert } from '../types.js';

/** Shown when MCP is used before logging in; instructs user to login and restart MCP. */
export const AUTH_REQUIRED_MSG =
  'BitCompass needs authentication. Run `bitcompass login`, then restart the MCP server in your editor.';

/** Shown when Supabase URL/key are not set; instructs config then login then restart MCP. */
export const NOT_CONFIGURED_MSG =
  'BitCompass is not configured. Run `bitcompass config set supabaseUrl` and `bitcompass config set supabaseAnonKey`, then `bitcompass login`, then restart the MCP server in your editor.';

const isAuthError = (err: { message?: string; code?: string }): boolean => {
  const m = (err.message ?? '').toLowerCase();
  const c = err.code ?? '';
  return (
    c === 'PGRST301' ||
    c === '401' ||
    m.includes('jwt') ||
    m.includes('row-level security') ||
    m.includes('permission denied') ||
    m.includes('not authenticated')
  );
};

const getSupabaseUrlAndKey = (): { url: string; key: string } | null => {
  const config = loadConfig();
  const url =
    config.supabaseUrl ??
    process.env.BITCOMPASS_SUPABASE_URL ??
    DEFAULT_SUPABASE_URL;
  const key =
    config.supabaseAnonKey ??
    process.env.BITCOMPASS_SUPABASE_ANON_KEY ??
    DEFAULT_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
};

/** Client for writes and authenticated reads (uses token when available). */
export const getSupabaseClient = (): SupabaseClient | null => {
  const pair = getSupabaseUrlAndKey();
  if (!pair) return null;
  const creds = loadCredentials();
  const accessToken = creds?.access_token;
  return createClient(pair.url, pair.key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
};

/** Client for public read-only (rules/solutions). Works without login when RLS allows public select. */
export const getSupabaseClientForRead = (): SupabaseClient | null => {
  const pair = getSupabaseUrlAndKey();
  if (!pair) return null;
  const creds = loadCredentials();
  const accessToken = creds?.access_token;
  return createClient(pair.url, pair.key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
};

export const fetchRules = async (kind?: 'rule' | 'solution'): Promise<Rule[]> => {
  const client = getSupabaseClientForRead();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  let query = client.from('rules').select('*').order('created_at', { ascending: false });
  if (kind) {
    query = query.eq('kind', kind);
  }
  const { data, error } = await query;
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return (data ?? []) as Rule[];
};

export const searchRules = async (
  queryText: string,
  options: { kind?: 'rule' | 'solution'; limit?: number } = {}
): Promise<Rule[]> => {
  const client = getSupabaseClientForRead();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  let query = client
    .from('rules')
    .select('*')
    .or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%,body.ilike.%${queryText}%`)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20);
  if (options.kind) {
    query = query.eq('kind', options.kind);
  }
  const { data, error } = await query;
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return (data ?? []) as Rule[];
};

export const getRuleById = async (id: string): Promise<Rule | null> => {
  const client = getSupabaseClientForRead();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  const { data, error } = await client.from('rules').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  }
  return data as Rule;
};

export const insertRule = async (rule: RuleInsert): Promise<Rule> => {
  const client = getSupabaseClient();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  const { data, error } = await client.from('rules').insert(rule).select().single();
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return data as Rule;
};

export const updateRule = async (id: string, updates: Partial<RuleInsert>): Promise<Rule> => {
  const client = getSupabaseClient();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  const { data, error } = await client.from('rules').update(updates).eq('id', id).select().single();
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return data as Rule;
};

export const deleteRule = async (id: string): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  const { error } = await client.from('rules').delete().eq('id', id);
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
};

export const insertActivityLog = async (payload: ActivityLogInsert): Promise<ActivityLog> => {
  const client = getSupabaseClient();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  const { data, error } = await client
    .from('activity_logs')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return data as ActivityLog;
};

export const fetchActivityLogs = async (options?: { limit?: number; time_frame?: 'day' | 'week' | 'month' }): Promise<ActivityLog[]> => {
  const client = getSupabaseClient();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  let query = client.from('activity_logs').select('*').order('created_at', { ascending: false });
  if (options?.time_frame) {
    query = query.eq('time_frame', options.time_frame);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return (data ?? []) as ActivityLog[];
};

export const getActivityLogById = async (id: string): Promise<ActivityLog | null> => {
  const client = getSupabaseClient();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  const { data, error } = await client.from('activity_logs').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  }
  return data as ActivityLog;
};
