import { searchKeyword } from '../domain/card-search';

export type CardListItem = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  note: string | null;
  createdAt: Date;
  topic: { id: string; name: string } | null;
  source: { id: string; title: string } | null;
  /** Tóm tắt lịch FSRS cho badge hạn ôn, S, D và "Ôn lần cuối" (US-013). */
  schedule: {
    state: string;
    dueDate: Date;
    stability: number;
    difficulty: number;
    lastReviewedAt: Date | null;
  };
};

/** Số thẻ theo Topic cho chip lọc — tính theo từ khoá nhưng bỏ qua bộ lọc Topic. */
export type TopicCounts = {
  all: number;
  unassigned: number;
  topics: { id: string; name: string; cardCount: number }[];
};

export const CARD_SORTS = ['recent', 'due', 'stability', 'difficulty'] as const;
export type CardSort = (typeof CARD_SORTS)[number];

export type ListCardsInput = {
  userId: string;
  sourceId?: string;
  /** `null` = chỉ thẻ chưa gán Topic; `undefined` = không lọc. */
  topicId?: string | null;
  q?: string;
  sort: CardSort;
  page: number;
  pageSize: number;
};

export type CardListQueryInput = Omit<ListCardsInput, 'q'> & { keyword?: string };

export type CardListQuery = {
  list(input: CardListQueryInput): Promise<{
    items: CardListItem[];
    totalItems: number;
    topicCounts: TopicCounts;
  }>;
};

export async function listCards(deps: { cards: CardListQuery }, input: ListCardsInput) {
  const { q, ...rest } = input;
  const keyword = searchKeyword(q);
  const result = await deps.cards.list(keyword === undefined ? rest : { ...rest, keyword });

  return {
    items: result.items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / input.pageSize),
    },
    topicCounts: result.topicCounts,
  };
}
