import { api } from '@src/shared/api/client';

import type { DueCard, ReviewOutcome } from '../domain/review';

export type DueCardsResponse = { dueCards: DueCard[]; dueCount: number };
export type StreakResponse = { currentStreak: number };

/** GET /api/cards/due — SPEC-003. */
export function fetchDueCards(): Promise<DueCardsResponse> {
  return api.get<DueCardsResponse>('/cards/due');
}

/** POST /api/review-outcomes — SPEC-004. */
export function recordOutcome(input: {
  cardId: string;
  outcome: ReviewOutcome;
}): Promise<{ outcomeId: string }> {
  return api.post('/review-outcomes', input);
}

/** DELETE /api/review-outcomes/:id — SPEC-013, BR-024. */
export function undoOutcome(outcomeId: string): Promise<unknown> {
  return api.delete(`/review-outcomes/${outcomeId}`);
}

export function fetchCurrentStreak(): Promise<StreakResponse> {
  return api.get<StreakResponse>('/streak');
}
