import { api } from '@src/shared/api/client';

import type { CardDraft } from '../domain/cardDraft';
import type {
  CardListItem,
  CardListResponse,
  DeletedCard,
  LibraryFilters,
  UpdateCardInput,
} from '../domain/cardLibrary';
import type { LibraryStats } from '../domain/libraryStats';

export type NewCard = Omit<CardDraft, 'note'> & {
  note?: string;
  sourceId?: string;
  topicId?: string;
};
export type CreatedCard = { id: string; topicId?: string | null };

/** POST /api/cards — SPEC-002. */
export function createCard(card: NewCard): Promise<CreatedCard> {
  return api.post<CreatedCard>('/cards', card);
}

export type CardListRequest = LibraryFilters & { pageSize: number };

/** GET /api/cards — SPEC-015. Chỉ gửi tham số khác mặc định. */
export function fetchCards(input: CardListRequest): Promise<CardListResponse> {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const keyword = input.q.trim();

  if (keyword !== '') query.set('q', keyword);
  if (input.sort !== 'recent') query.set('sort', input.sort);
  if (input.topic !== '') query.set('topic', input.topic);

  return api.get<CardListResponse>(`/cards?${query.toString()}`);
}

/** GET /api/cards/stats — SPEC-016, số liệu trên toàn bộ Thư viện. */
export function fetchLibraryStats(): Promise<LibraryStats> {
  return api.get<LibraryStats>('/cards/stats');
}

/** PATCH /api/cards/:id — chỉ sửa nội dung, không thay đổi lịch ôn. */
export function updateCard(cardId: string, input: UpdateCardInput): Promise<CardListItem> {
  return api.patch<CardListItem>(`/cards/${encodeURIComponent(cardId)}`, input);
}

/** PATCH /api/cards/:id/topic — SPEC-006; `null` là bỏ gán Topic. */
export function assignCardTopic(cardId: string, topicId: string | null): Promise<unknown> {
  return api.patch<unknown>(`/cards/${encodeURIComponent(cardId)}/topic`, { topicId });
}

/** DELETE /api/cards/:id — máy chủ chịu trách nhiệm xóa cascade. */
export function deleteCard(cardId: string): Promise<DeletedCard> {
  return api.delete<DeletedCard>(`/cards/${encodeURIComponent(cardId)}`);
}
