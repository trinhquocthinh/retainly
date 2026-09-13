import { api } from '@src/shared/api/client';

import type { CardDraft } from '../domain/cardDraft';

export type CreatedCard = { id: string };

/** POST /api/cards — SPEC-002. */
export function createCard(draft: CardDraft): Promise<CreatedCard> {
  return api.post<CreatedCard>('/cards', draft);
}
