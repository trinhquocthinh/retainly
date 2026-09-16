type CardListItem = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  createdAt: Date;
};

export type CardListQueryInput = {
  userId: string;
  sourceId?: string;
  page: number;
  pageSize: number;
};

export type CardListQuery = {
  list(input: CardListQueryInput): Promise<{
    items: CardListItem[];
    totalItems: number;
  }>;
};

export async function listCards(deps: { cards: CardListQuery }, input: CardListQueryInput) {
  const result = await deps.cards.list(input);

  return {
    items: result.items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / input.pageSize),
    },
  };
}
