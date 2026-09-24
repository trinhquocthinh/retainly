import { api } from '@src/shared/api/client';

import type { HomeOverview } from '../domain/home';
import type { DueCard, ReviewOutcome } from '../domain/review';

export type DueCardsResponse = { dueCards: DueCard[]; dueCount: number };
export type ExtraCardsResponse = { extraCards: DueCard[] };

/** GET /api/cards/due — SPEC-003. */
export function fetchDueCards(): Promise<DueCardsResponse> {
  return api.get<DueCardsResponse>('/cards/due');
}

/** GET /api/cards/due?topicId= — SPEC-003 lọc theo Topic, cho "Ôn ngay" ở màn Thống kê. */
export function fetchTopicDueCards(topicId: string): Promise<DueCardsResponse> {
  return api.get<DueCardsResponse>(`/cards/due?topicId=${encodeURIComponent(topicId)}`);
}

/** GET /api/cards/extra — SPEC-014, BR-026. */
export function fetchExtraCards(): Promise<ExtraCardsResponse> {
  return api.get<ExtraCardsResponse>('/cards/extra');
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

/** GET /api/home/overview — SPEC-017, dùng chung cho Trang chủ và sidebar. */
export function fetchHomeOverview(): Promise<HomeOverview> {
  return api.get<HomeOverview>('/home/overview');
}
