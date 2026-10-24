import { api } from '@src/shared/api/client';

import type { HomeOverview } from '../domain/home';
import type { DueCard } from '../domain/review';

export type DueCardsResponse = { dueCards: DueCard[]; dueCount: number };

/** GET /api/cards/due — SPEC-003. */
export function fetchDueCards(): Promise<DueCardsResponse> {
  return api.get<DueCardsResponse>('/cards/due');
}

/** GET /api/home/overview — SPEC-017, dùng chung cho Trang chủ và sidebar. */
export function fetchHomeOverview(): Promise<HomeOverview> {
  return api.get<HomeOverview>('/home/overview');
}
