import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadConfig, loadCredentials } from '../auth/config.js';
import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL } from '../auth/defaults.js';
import type { Rule, RuleInsert } from '../types.js';

export const getSupabaseClient = (): SupabaseClient | null => {
  const config = loadConfig();
  const creds = loadCredentials();
  const url =
    config.supabaseUrl ??
    process.env.BITCOMPASS_SUPABASE_URL ??
    DEFAULT_SUPABASE_URL;
  const key =
    config.supabaseAnonKey ??
    process.env.BITCOMPASS_SUPABASE_ANON_KEY ??
    DEFAULT_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  const accessToken = creds?.access_token;
  const client = createClient(url, key, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
  return client;
};

export const fetchRules = async (kind?: 'rule' | 'solution'): Promise<Rule[]> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase not configured. Set BITCOMPASS_SUPABASE_URL and BITCOMPASS_SUPABASE_ANON_KEY or run bitcompass config.');
  }
  let query = client.from('rules').select('*').order('created_at', { ascending: false });
  if (kind) {
    query = query.eq('kind', kind);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Rule[];
};

export const searchRules = async (
  queryText: string,
  options: { kind?: 'rule' | 'solution'; limit?: number } = {}
): Promise<Rule[]> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase not configured.');
  }
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
  if (error) throw new Error(error.message);
  return (data ?? []) as Rule[];
};

export const getRuleById = async (id: string): Promise<Rule | null> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured.');
  const { data, error } = await client.from('rules').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return data as Rule;
};

export const insertRule = async (rule: RuleInsert): Promise<Rule> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured.');
  const { data, error } = await client.from('rules').insert(rule).select().single();
  if (error) throw new Error(error.message);
  return data as Rule;
};

export const updateRule = async (id: string, updates: Partial<RuleInsert>): Promise<Rule> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured.');
  const { data, error } = await client.from('rules').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as Rule;
};

export const deleteRule = async (id: string): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured.');
  const { error } = await client.from('rules').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
