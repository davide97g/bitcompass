import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Rule, RuleInsert } from '@/types/bitcompass';

const TABLE = 'rules';

const fetchRules = async (kind?: 'rule' | 'solution'): Promise<Rule[]> => {
  if (!supabase) return [];
  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Rule[];
};

const fetchRuleById = async (id: string): Promise<Rule | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Rule;
};

export const useRules = (kind?: 'rule' | 'solution') => {
  return useQuery({
    queryKey: ['rules', kind],
    queryFn: () => fetchRules(kind),
    enabled: Boolean(supabase),
  });
};

export const useRule = (id: string | undefined) => {
  return useQuery({
    queryKey: ['rule', id],
    queryFn: () => fetchRuleById(id!),
    enabled: Boolean(supabase && id),
  });
};

const getAuthorDisplayName = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.user_metadata) return null;
  const meta = user.user_metadata as Record<string, string | undefined>;
  return meta.full_name ?? meta.name ?? user.email ?? null;
};

export const useInsertRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: RuleInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      const author_display_name = await getAuthorDisplayName();
      const row = { ...rule, ...(author_display_name ? { author_display_name } : {}) };
      const { data, error } = await supabase.from(TABLE).insert(row).select().single();
      if (error) throw error;
      return data as Rule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
};

export const useUpdateRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RuleInsert> }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Rule;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['rules'] });
      qc.invalidateQueries({ queryKey: ['rule', id] });
    },
  });
};

export const useDeleteRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
};
