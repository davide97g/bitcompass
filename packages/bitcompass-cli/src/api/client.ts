import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig, loadCredentials } from '../auth/config.js';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from '../auth/defaults.js';
import type {
  ActivityLog,
  ActivityLogInsert,
  CompassProject,
  Rule,
  RuleInsert,
  RuleKind,
  RuleVisibility,
} from '../types.js';

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
export const getSupabaseClientForRead = getSupabaseClient;

/**
 * Returns the current user id (JWT sub) if logged in, otherwise null.
 * Decodes the access_token payload without verification (local read-only).
 */
export const getCurrentUserId = (): string | null => {
  const creds = loadCredentials();
  const token = creds?.access_token;
  if (!token) return null;
  const parts = token.split('.');
  const payloadPart = parts[1];
  if (parts.length !== 3 || !payloadPart) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf-8')
    ) as { sub?: string };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
};

/**
 * Returns Compass projects the current user is a member of (visibility for init choice).
 */
export const fetchCompassProjectsForCurrentUser = async (): Promise<CompassProject[]> => {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const client = getSupabaseClient();
  if (!client) return [];
  const { data: members, error: membersError } = await client
    .from('compass_project_members')
    .select('project_id')
    .eq('user_id', userId);
  if (membersError || !members?.length) return [];
  const projectIds = [...new Set((members as { project_id: string }[]).map((m) => m.project_id))];
  const { data: projects, error: projectsError } = await client
    .from('compass_projects')
    .select('id, title, description, created_at, updated_at')
    .in('id', projectIds)
    .order('title', { ascending: true });
  if (projectsError) return [];
  return (projects ?? []) as CompassProject[];
};

export const getCompassProjectById = async (id: string): Promise<CompassProject | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('compass_projects')
    .select('id, title, description, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    return null;
  }
  return data as CompassProject;
};

export interface FetchRulesOptions {
  projectId?: string | null;
  visibility?: RuleVisibility;
}

export const fetchRules = async (
  kind?: RuleKind,
  options?: FetchRulesOptions
): Promise<Rule[]> => {
  const client = getSupabaseClientForRead();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  let query = client.from('rules').select('*').order('created_at', { ascending: false });
  if (kind) {
    query = query.eq('kind', kind);
  }
  if (options?.projectId != null && options.projectId !== '') {
    query = query.eq('project_id', options.projectId);
  }
  if (options?.visibility) {
    query = query.eq('visibility', options.visibility);
  }
  const { data, error } = await query;
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return (data ?? []) as Rule[];
};

export const searchRules = async (
  queryText: string,
  options: { kind?: RuleKind; limit?: number } = {}
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

/**
 * Fetches rules by IDs only (e.g. IDs from local folder). Use this when the sink is the folder.
 */
export const fetchRulesByIds = async (ids: string[]): Promise<Rule[]> => {
  if (ids.length === 0) return [];
  const client = getSupabaseClientForRead();
  if (!client) throw new Error(NOT_CONFIGURED_MSG);
  const { data, error } = await client
    .from('rules')
    .select('*')
    .in('id', ids);
  if (error) throw new Error(isAuthError(error) ? AUTH_REQUIRED_MSG : error.message);
  return (data ?? []) as Rule[];
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
