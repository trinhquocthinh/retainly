import type { CardDraft } from './cardDraft';

export type CardListItem = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  note: string | null;
  createdAt: string;
};

export type CardListResponse = {
  items: CardListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

/** Gửi đủ ba trường; ghi chú rỗng nghĩa là xoá ghi chú. */
export type UpdateCardInput = CardDraft;
export type DeletedCard = { deleted: true };
