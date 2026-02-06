import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Rule, RuleInsert, RuleKind } from '@/types/bitcompass';

const TABLE = 'rules';

const fetchRules = async (kind?: RuleKind): Promise<Rule[]> => {
  if (!supabase) return [];
  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Rule[];
};

export interface FetchRulesPaginatedOptions {
  kind?: RuleKind | 'all';
  limit: number;
  offset: number;
  search?: string;
}

const fetchRulesPaginated = async (
  options: FetchRulesPaginatedOptions
): Promise<{ data: Rule[]; total: number }> => {
  if (!supabase) return { data: [], total: 0 };
  const { kind, limit, offset, search } = options;
  let query = supabase
    .from(TABLE)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (kind && kind !== 'all') query = query.eq('kind', kind);
  if (search?.trim()) {
    const q = search.trim();
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,body.ilike.%${q}%`);
  }
  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: (data ?? []) as Rule[], total: count ?? 0 };
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

export const useRules = (kind?: RuleKind) => {
  return useQuery({
    queryKey: ['rules', kind],
    queryFn: () => fetchRules(kind),
    enabled: Boolean(supabase),
  });
};

const RULES_PAGE_SIZE = 20;

export interface UseRulesPaginatedParams {
  kind: RuleKind | 'all';
  page: number;
  search?: string;
  pageSize?: number;
}

export const useRulesPaginated = ({
  kind,
  page,
  search = '',
  pageSize = RULES_PAGE_SIZE,
}: UseRulesPaginatedParams) => {
  const offset = (page - 1) * pageSize;
  return useQuery({
    queryKey: ['rules-paginated', kind, page, search.trim(), pageSize],
    queryFn: () =>
      fetchRulesPaginated({
        kind,
        limit: pageSize,
        offset,
        search: search.trim() || undefined,
      }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] });
      qc.invalidateQueries({ queryKey: ['rules-paginated'] });
    },
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
      qc.invalidateQueries({ queryKey: ['rules-paginated'] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] });
      qc.invalidateQueries({ queryKey: ['rules-paginated'] });
    },
  });
};
