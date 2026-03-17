import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { projects as projectsSeed } from '@/data/mockData';
import {
  fetchProjects,
  fetchProjectById,
  insertProject,
  updateProject,
  deleteProject,
} from '@/lib/supabase-entities';
import type { Project } from '@/data/mockData';
import type { ProjectRow } from '@/types/entities';

const fetchProjectsMerged = async (): Promise<Project[]> => {
  const fromDb = await fetchProjects();
  return [...projectsSeed, ...fromDb];
};

export const useProjects = () => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjectsMerged,
    enabled: Boolean(supabase && session),
  });
};

export const useProject = (id: string | undefined) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProjectById(id!),
    enabled: Boolean(supabase && session && id),
  });
};

export const useInsertProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      project: Partial<Project> & { name: string; status: ProjectRow['status']; startDate: string }
    ) => insertProject(project),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      updateProject(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', id] });
    },
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};
