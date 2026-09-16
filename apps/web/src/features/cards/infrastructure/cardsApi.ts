import { api } from '@src/shared/api/client';

import type { CardDraft } from '../domain/cardDraft';
import type {
  CardListItem,
  CardListResponse,
  DeletedCard,
  UpdateCardInput,
} from '../domain/cardLibrary';

export type NewCard = CardDraft & { sourceId?: string };
export type CreatedCard = { id: string };

/** POST /api/cards — SPEC-002. */
export function createCard(card: NewCard): Promise<CreatedCard> {
  return api.post<CreatedCard>('/cards', card);
}

/** GET /api/cards — danh sách phân trang của người dùng hiện tại. */
export function fetchCards(input: { page: number; pageSize: number }): Promise<CardListResponse> {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });

  return api.get<CardListResponse>(`/cards?${query.toString()}`);
}

/** PATCH /api/cards/:id — chỉ sửa nội dung, không thay đổi lịch ôn. */
export function updateCard(cardId: string, input: UpdateCardInput): Promise<CardListItem> {
  return api.patch<CardListItem>(`/cards/${encodeURIComponent(cardId)}`, input);
}

/** DELETE /api/cards/:id — máy chủ chịu trách nhiệm xóa cascade. */
export function deleteCard(cardId: string): Promise<DeletedCard> {
  return api.delete<DeletedCard>(`/cards/${encodeURIComponent(cardId)}`);
}
