import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RuleGroup, RuleGroupItem, Rule } from '@/types/bitcompass';

const GROUPS_TABLE = 'rule_groups';
const ITEMS_TABLE = 'rule_group_items';

const fetchRuleGroups = async (): Promise<RuleGroup[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(GROUPS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RuleGroup[];
};

const fetchRuleGroupById = async (id: string): Promise<RuleGroup | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(GROUPS_TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as RuleGroup;
};

const fetchRuleGroupItems = async (groupId: string): Promise<RuleGroupItem[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .eq('group_id', groupId);
  if (error) throw error;
  return (data ?? []) as RuleGroupItem[];
};

const fetchRuleGroupRules = async (groupId: string): Promise<Rule[]> => {
  if (!supabase) return [];
  const { data: items, error: itemsErr } = await supabase
    .from(ITEMS_TABLE)
    .select('rule_id')
    .eq('group_id', groupId);
  if (itemsErr) throw itemsErr;
  const ruleIds = (items ?? []).map((i: { rule_id: string }) => i.rule_id);
  if (ruleIds.length === 0) return [];
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .in('id', ruleIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Rule[];
};

const fetchRuleGroupsForRule = async (ruleId: string): Promise<RuleGroup[]> => {
  if (!supabase) return [];
  const { data: items, error: itemsErr } = await supabase
    .from(ITEMS_TABLE)
    .select('group_id')
    .eq('rule_id', ruleId);
  if (itemsErr) throw itemsErr;
  const groupIds = (items ?? []).map((i: { group_id: string }) => i.group_id);
  if (groupIds.length === 0) return [];
  const { data, error } = await supabase
    .from(GROUPS_TABLE)
    .select('*')
    .in('id', groupIds);
  if (error) throw error;
  return (data ?? []) as RuleGroup[];
};

const fetchRuleGroupItemCounts = async (): Promise<Record<string, number>> => {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select('group_id');
  if (error) throw error;
  const rows = (data ?? []) as { group_id: string }[];
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.group_id] = (acc[row.group_id] ?? 0) + 1;
    return acc;
  }, {});
};

export const useRuleGroups = () => {
  return useQuery({
    queryKey: ['rule-groups'],
    queryFn: fetchRuleGroups,
    enabled: Boolean(supabase),
  });
};

export const useRuleGroup = (id: string | undefined) => {
  return useQuery({
    queryKey: ['rule-group', id],
    queryFn: () => fetchRuleGroupById(id!),
    enabled: Boolean(supabase && id),
  });
};

export const useRuleGroupItems = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['rule-group-items', groupId],
    queryFn: () => fetchRuleGroupItems(groupId!),
    enabled: Boolean(supabase && groupId),
  });
};

export const useRuleGroupRules = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['rule-group-rules', groupId],
    queryFn: () => fetchRuleGroupRules(groupId!),
    enabled: Boolean(supabase && groupId),
  });
};

export const useRuleGroupsForRule = (ruleId: string | undefined) => {
  return useQuery({
    queryKey: ['rule-groups-for-rule', ruleId],
    queryFn: () => fetchRuleGroupsForRule(ruleId!),
    enabled: Boolean(supabase && ruleId),
  });
};

export const useRuleGroupItemCounts = () => {
  return useQuery({
    queryKey: ['rule-group-item-counts'],
    queryFn: fetchRuleGroupItemCounts,
    enabled: Boolean(supabase),
  });
};

export interface RuleGroupInsert {
  title: string;
  description?: string;
  parent_id?: string | null;
}

export const useInsertRuleGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: RuleGroupInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from(GROUPS_TABLE)
        .insert({
          title: insert.title,
          description: insert.description ?? '',
          parent_id: insert.parent_id ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as RuleGroup;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rule-groups'] });
    },
  });
};

export const useUpdateRuleGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<RuleGroupInsert>;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from(GROUPS_TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RuleGroup;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['rule-groups'] });
      qc.invalidateQueries({ queryKey: ['rule-group', id] });
    },
  });
};

export const useDeleteRuleGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from(GROUPS_TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rule-groups'] });
      qc.invalidateQueries({ queryKey: ['rule-group-item-counts'] });
    },
  });
};

export const useAddRuleToGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      ruleId,
    }: {
      groupId: string;
      ruleId: string;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from(ITEMS_TABLE).insert({
        group_id: groupId,
        rule_id: ruleId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { groupId, ruleId }) => {
      qc.invalidateQueries({ queryKey: ['rule-group-items', groupId] });
      qc.invalidateQueries({ queryKey: ['rule-group-rules', groupId] });
      qc.invalidateQueries({ queryKey: ['rule-groups-for-rule', ruleId] });
      qc.invalidateQueries({ queryKey: ['rule-group-item-counts'] });
    },
  });
};

export const useRemoveRuleFromGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      ruleId,
    }: {
      groupId: string;
      ruleId: string;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from(ITEMS_TABLE)
        .delete()
        .eq('group_id', groupId)
        .eq('rule_id', ruleId);
      if (error) throw error;
    },
    onSuccess: (_, { groupId, ruleId }) => {
      qc.invalidateQueries({ queryKey: ['rule-group-items', groupId] });
      qc.invalidateQueries({ queryKey: ['rule-group-rules', groupId] });
      qc.invalidateQueries({ queryKey: ['rule-groups-for-rule', ruleId] });
      qc.invalidateQueries({ queryKey: ['rule-group-item-counts'] });
    },
  });
};
