import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { fetchActivityLogs, fetchActivityLogById, fetchActivityLogsPaginated } from '@/lib/activity-logs';

const ACTIVITY_LOGS_PAGE_SIZE = 20;

export const useActivityLogs = () => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['activity-logs'],
    queryFn: fetchActivityLogs,
    enabled: Boolean(supabase && session),
  });
};

/** Paginated activity logs with "Load more". Use for ActivityLogsPage to avoid loading all at once. */
export const useActivityLogsInfinite = (pageSize: number = ACTIVITY_LOGS_PAGE_SIZE) => {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: ['activity-logs-infinite', pageSize],
    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as number) * pageSize;
      return fetchActivityLogsPaginated({ limit: pageSize, offset });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.data.length, 0);
      return lastPage.data.length === pageSize && loaded < lastPage.total
        ? allPages.length
        : undefined;
    },
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
