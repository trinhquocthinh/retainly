import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type {
  CardListResponse,
  DeletedCard,
  UpdateCardInput,
  CardListItem,
} from '../domain/cardLibrary';

const PAGE_SIZE = 20;

type CardLibraryPorts = {
  fetchCards: (input: { page: number; pageSize: number }) => Promise<CardListResponse>;
  updateCard: (cardId: string, input: UpdateCardInput) => Promise<CardListItem>;
  deleteCard: (cardId: string) => Promise<DeletedCard>;
};

export function useCardLibrary(deps: CardLibraryPorts) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['cards', 'library', { page, pageSize: PAGE_SIZE }],
    queryFn: () => deps.fetchCards({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  async function refreshCardQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cards', 'library'] }),
      queryClient.invalidateQueries({ queryKey: ['cards', 'due'] }),
    ]);
  }

  const updateMutation = useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: UpdateCardInput }) =>
      deps.updateCard(cardId, input),
    onSuccess: refreshCardQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: deps.deleteCard,
    onSuccess: async () => {
      if ((query.data?.items.length ?? 0) === 1 && page > 1) {
        setPage((current) => current - 1);
      }
      await refreshCardQueries();
    },
  });

  return {
    page,
    pageSize: PAGE_SIZE,
    data: query.data,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    loadError: query.error,
    reload: () => void query.refetch(),
    goToPage: setPage,

    updating: updateMutation.isPending,
    updateError: updateMutation.error,
    resetUpdate: updateMutation.reset,
    saveCard: (cardId: string, input: UpdateCardInput) =>
      updateMutation.mutateAsync({ cardId, input }),

    deleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    resetDelete: deleteMutation.reset,
    removeCard: deleteMutation.mutateAsync,
  };
}
