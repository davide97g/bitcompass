import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/bitcompass';

const TABLE = 'profiles';

const searchProfiles = async (query: string): Promise<Profile[]> => {
  if (!supabase) return [];
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Profile[];
};

export const useProfilesSearch = (query: string) => {
  return useQuery({
    queryKey: ['profiles-search', query.trim()],
    queryFn: () => searchProfiles(query),
    enabled: Boolean(supabase && query.trim().length > 0),
  });
};

const fetchProfileById = async (id: string): Promise<Profile | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Profile;
};

export const useProfile = (id: string | undefined) => {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => (id ? fetchProfileById(id) : Promise.resolve(null)),
    enabled: Boolean(supabase && id),
  });
};

const fetchProfilesByIds = async (ids: string[]): Promise<Profile[]> => {
  if (!supabase || ids.length === 0) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as Profile[];
};

export const useProfilesByIds = (ids: string[]) => {
  return useQuery({
    queryKey: ['profiles-by-ids', ids.sort().join(',')],
    queryFn: () => fetchProfilesByIds(ids),
    enabled: Boolean(supabase && ids.length > 0),
  });
};
