import type { CardDraft } from './cardDraft';

export type CardListItem = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
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

export type UpdateCardInput = Pick<CardDraft, 'front' | 'back'>;
export type DeletedCard = { deleted: true };
