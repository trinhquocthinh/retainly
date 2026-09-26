import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Topic, TopicsResponse } from '../domain/topic';

const TOPICS_QUERY_KEY = ['topics'] as const;

type TopicPorts = {
  fetchTopics: () => Promise<TopicsResponse>;
  createTopic: (name: string) => Promise<Topic>;
};

function byName(left: Topic, right: Topic): number {
  return left.name.localeCompare(right.name, 'vi');
}

export function useTopics(deps: TopicPorts) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TOPICS_QUERY_KEY,
    queryFn: deps.fetchTopics,
    staleTime: 60_000,
  });

  const creation = useMutation({
    mutationFn: deps.createTopic,
    onSuccess: (topic) => {
      queryClient.setQueryData<TopicsResponse>(TOPICS_QUERY_KEY, (current) => ({
        topics: [...(current?.topics ?? []), topic].sort(byName),
      }));
    },
  });

  return {
    topics: query.data?.topics ?? [],
    loading: query.isPending,
    loadError: query.error,
    reload: () => void query.refetch(),

    creating: creation.isPending,
    createError: creation.error,
    resetCreate: creation.reset,
    addTopic: creation.mutateAsync,
  };
}
