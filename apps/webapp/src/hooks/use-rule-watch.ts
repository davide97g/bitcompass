import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import type { RuleWatch } from '@/types/bitcompass';

const TABLE = 'rule_watches';

export const useRuleWatch = (ruleId: string | undefined) => {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [TABLE, ruleId, userId],
    queryFn: async (): Promise<RuleWatch | null> => {
      if (!supabase || !ruleId || !userId) return null;
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('rule_id', ruleId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as RuleWatch | null;
    },
    enabled: Boolean(supabase && ruleId && userId),
  });
};

export const useToggleRuleWatch = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ruleId, isWatching }: { ruleId: string; isWatching: boolean }) => {
      if (!supabase || !user?.id) throw new Error('Not authenticated');
      if (isWatching) {
        const { error } = await supabase
          .from(TABLE)
          .delete()
          .eq('rule_id', ruleId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLE)
          .insert({ rule_id: ruleId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, { ruleId }) => {
      qc.invalidateQueries({ queryKey: [TABLE, ruleId] });
    },
  });
};
