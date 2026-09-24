import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CardEdit,
  CardListResponse,
  DeletedCard,
  LibraryFilters,
  UpdateCardInput,
  CardListItem,
} from '../domain/cardLibrary';

const PAGE_SIZE = 20;

type CardLibraryPorts = {
  fetchCards: (input: LibraryFilters & { pageSize: number }) => Promise<CardListResponse>;
  updateCard: (cardId: string, input: UpdateCardInput) => Promise<CardListItem>;
  assignCardTopic: (cardId: string, topicId: string | null) => Promise<unknown>;
  deleteCard: (cardId: string) => Promise<DeletedCard>;
};

type LibraryView = {
  filters: LibraryFilters;
  goToPage: (page: number) => void;
};

export function useCardLibrary(deps: CardLibraryPorts, { filters, goToPage }: LibraryView) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cards', 'library', filters],
    queryFn: () => deps.fetchCards({ ...filters, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  async function refreshCardQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cards', 'library'] }),
      queryClient.invalidateQueries({ queryKey: ['cards', 'due'] }),
      queryClient.invalidateQueries({ queryKey: ['home', 'overview'] }),
      // Thống kê theo Topic và vùng bền vững đổi khi thẻ đổi nhánh hoặc bị xoá.
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
    ]);
  }

  // Nội dung và Topic là hai endpoint riêng; gửi tuần tự, phần nào không đổi thì bỏ.
  // Topic hỏng sau khi nội dung đã lưu thì dialog vẫn mở, lưu lại chỉ ghi đè cùng giá trị.
  const updateMutation = useMutation({
    mutationFn: async ({ cardId, edit }: { cardId: string; edit: CardEdit }) => {
      if (edit.content) await deps.updateCard(cardId, edit.content);
      if (edit.topicId !== undefined) await deps.assignCardTopic(cardId, edit.topicId);
    },
    onSuccess: refreshCardQueries,
  });

  const deleteMutation = useMutation({
    mutationFn: deps.deleteCard,
    onSuccess: async () => {
      if ((query.data?.items.length ?? 0) === 1 && filters.page > 1) {
        goToPage(filters.page - 1);
      }
      await refreshCardQueries();
    },
  });

  return {
    pageSize: PAGE_SIZE,
    data: query.data,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    loadError: query.error,
    reload: () => void query.refetch(),

    updating: updateMutation.isPending,
    updateError: updateMutation.error,
    resetUpdate: updateMutation.reset,
    saveCard: (cardId: string, edit: CardEdit) => updateMutation.mutateAsync({ cardId, edit }),

    deleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    resetDelete: deleteMutation.reset,
    removeCard: deleteMutation.mutateAsync,
  };
}
