import { api } from '@src/shared/api/client';

import type { DueCard, ReviewOutcome } from '../domain/review';

export type DueCardsResponse = { dueCards: DueCard[]; dueCount: number };

/** GET /api/cards/due — SPEC-003. */
export function fetchDueCards(): Promise<DueCardsResponse> {
  return api.get<DueCardsResponse>('/cards/due');
}

/** POST /api/review-outcomes — SPEC-004. */
export function recordOutcome(input: { cardId: string; outcome: ReviewOutcome }): Promise<unknown> {
  return api.post('/review-outcomes', input);
}
