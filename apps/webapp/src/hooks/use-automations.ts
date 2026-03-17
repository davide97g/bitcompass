import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { automations as automationsSeed } from '@/data/mockData';
import {
  fetchAutomations,
  fetchAutomationById,
  insertAutomation,
  updateAutomation,
  deleteAutomation,
} from '@/lib/supabase-entities';
import type { Automation } from '@/data/mockData';
import type { AutomationRow } from '@/types/entities';

const fetchAutomationsMerged = async (): Promise<Automation[]> => {
  const fromDb = await fetchAutomations();
  return [...automationsSeed, ...fromDb];
};

export const useAutomations = () => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['automations'],
    queryFn: fetchAutomationsMerged,
    enabled: Boolean(supabase && session),
  });
};

export const useAutomation = (id: string | undefined) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['automation', id],
    queryFn: () => fetchAutomationById(id!),
    enabled: Boolean(supabase && session && id),
  });
};

export const useInsertAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      automation: Partial<Automation> & {
        title: string;
        description: string;
        category: AutomationRow['category'];
      }
    ) => insertAutomation(automation),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
};

export const useUpdateAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Automation> }) =>
      updateAutomation(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      qc.invalidateQueries({ queryKey: ['automation', id] });
    },
  });
};

export const useDeleteAutomation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
};
