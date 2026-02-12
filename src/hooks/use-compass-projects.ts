import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CompassProject, CompassProjectMember } from '@/types/bitcompass';

const PROJECTS_TABLE = 'compass_projects';
const MEMBERS_TABLE = 'compass_project_members';

const fetchCompassProjects = async (): Promise<CompassProject[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CompassProject[];
};

const fetchCompassProjectById = async (id: string): Promise<CompassProject | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as CompassProject;
};

const fetchCompassProjectMembers = async (
  projectId: string
): Promise<CompassProjectMember[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(MEMBERS_TABLE)
    .select('*')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data ?? []) as CompassProjectMember[];
};

export const useCompassProjects = () => {
  return useQuery({
    queryKey: ['compass-projects'],
    queryFn: fetchCompassProjects,
    enabled: Boolean(supabase),
  });
};

export const useCompassProject = (id: string | undefined) => {
  return useQuery({
    queryKey: ['compass-project', id],
    queryFn: () => fetchCompassProjectById(id!),
    enabled: Boolean(supabase && id),
  });
};

export const useCompassProjectMembers = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['compass-project-members', projectId],
    queryFn: () => fetchCompassProjectMembers(projectId!),
    enabled: Boolean(supabase && projectId),
  });
};

export interface CompassProjectInsert {
  title: string;
  description?: string;
}

export const useInsertCompassProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (insert: CompassProjectInsert) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .insert({
          title: insert.title,
          description: insert.description ?? '',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as CompassProject;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compass-projects'] });
    },
  });
};

export const useUpdateCompassProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CompassProjectInsert>;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from(PROJECTS_TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CompassProject;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['compass-projects'] });
      qc.invalidateQueries({ queryKey: ['compass-project', id] });
    },
  });
};

export const useDeleteCompassProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from(PROJECTS_TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compass-projects'] });
    },
  });
};

export const useAddCompassProjectMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.from(MEMBERS_TABLE).insert({
        project_id: projectId,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['compass-project-members', projectId] });
      qc.invalidateQueries({ queryKey: ['compass-project', projectId] });
    },
  });
};

export const useRemoveCompassProjectMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from(MEMBERS_TABLE)
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['compass-project-members', projectId] });
      qc.invalidateQueries({ queryKey: ['compass-project', projectId] });
    },
  });
};
