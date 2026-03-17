import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { problems as problemsSeed } from '@/data/mockData';
import {
  fetchProblems,
  fetchProblemById,
  insertProblem,
  updateProblem,
  deleteProblem,
} from '@/lib/supabase-entities';
import type { Problem } from '@/data/mockData';
import type { ProblemRow } from '@/types/entities';

const fetchProblemsMerged = async (): Promise<Problem[]> => {
  const fromDb = await fetchProblems();
  return [...problemsSeed, ...fromDb];
};

export const useProblems = () => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['problems'],
    queryFn: fetchProblemsMerged,
    enabled: Boolean(supabase && session),
  });
};

export const useProblem = (id: string | undefined) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['problem', id],
    queryFn: () => fetchProblemById(id!),
    enabled: Boolean(supabase && session && id),
  });
};

export const useInsertProblem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (problem: Partial<Problem> & { title: string; status: ProblemRow['status'] }) =>
      insertProblem(problem),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['problems'] }),
  });
};

export const useUpdateProblem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Problem> }) =>
      updateProblem(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['problems'] });
      qc.invalidateQueries({ queryKey: ['problem', id] });
    },
  });
};

export const useDeleteProblem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProblem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['problems'] }),
  });
};
