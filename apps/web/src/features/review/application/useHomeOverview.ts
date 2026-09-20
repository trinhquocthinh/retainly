import { useQuery } from '@tanstack/react-query';

type HomeOverviewPorts = {
  fetchDueCards: () => Promise<{ dueCount: number }>;
  fetchCurrentStreak: () => Promise<{ currentStreak: number }>;
};

export function useHomeOverview(deps: HomeOverviewPorts) {
  const due = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: deps.fetchDueCards,
    staleTime: 60_000,
  });

  const streak = useQuery({
    queryKey: ['review', 'streak'],
    queryFn: deps.fetchCurrentStreak,
    staleTime: 60_000,
  });

  return {
    dueCount: due.data?.dueCount ?? 0,
    currentStreak: streak.data?.currentStreak ?? 0,
    loading: due.isPending || streak.isPending,
    failed: due.isError || streak.isError,
    error: due.error ?? streak.error,

    reload: () => {
      void Promise.all([due.refetch(), streak.refetch()]);
    },
  };
}
