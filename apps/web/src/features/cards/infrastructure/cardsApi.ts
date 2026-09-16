import { api } from '@src/shared/api/client';

import type { CardDraft } from '../domain/cardDraft';

export type NewCard = CardDraft & { sourceId?: string };
export type CreatedCard = { id: string };

/** POST /api/cards — SPEC-002. */
export function createCard(card: NewCard): Promise<CreatedCard> {
  return api.post<CreatedCard>('/cards', card);
}
