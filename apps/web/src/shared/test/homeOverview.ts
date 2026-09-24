import type { HomeOverview } from '@src/features/review/domain/home';

/** Tổng quan Trang chủ giả (SPEC-017). Mặc định: đã có thẻ, hôm nay không còn gì để ôn. */
export function homeOverview(overrides: Partial<HomeOverview> = {}): HomeOverview {
  return {
    todayProgress: { reviewed: 0, total: 0 },
    streak: { current: 0, longest: 0, week: [] },
    library: { totalCards: 1, topicCount: 0, difficultCards: 0 },
    dueByTopic: [],
    upcoming: [],
    ...overrides,
  };
}
