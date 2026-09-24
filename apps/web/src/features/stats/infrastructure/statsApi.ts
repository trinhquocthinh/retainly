import { api } from '@src/shared/api/client';

import type { Stats, StatsRange } from '../domain/stats';

/** GET /api/stats — SPEC-018. */
export function fetchStats(range: StatsRange): Promise<Stats> {
  return api.get<Stats>(`/stats?range=${range}`);
}
