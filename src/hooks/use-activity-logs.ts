import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { fetchActivityLogs, fetchActivityLogById } from '@/lib/activity-logs';

export const useActivityLogs = () => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['activity-logs'],
    queryFn: fetchActivityLogs,
    enabled: Boolean(supabase && session),
  });
};

export const useActivityLog = (id: string | undefined) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['activity-log', id],
    queryFn: () => fetchActivityLogById(id!),
    enabled: Boolean(supabase && session && id),
  });
};
