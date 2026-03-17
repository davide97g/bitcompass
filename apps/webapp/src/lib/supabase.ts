import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  '';

// Client uses the current auth session for all .from() requests; RLS applies per user.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = (): boolean => Boolean(supabase);
