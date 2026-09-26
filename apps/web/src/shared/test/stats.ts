import type { Stats, TopicStats } from '@src/features/stats/domain/stats';

/** Một dòng Topic giả của SPEC-018. */
export function topicStats(overrides: Partial<TopicStats> = {}): TopicStats {
  return {
    topic: { id: 'topic-1', name: 'Kiến trúc phần mềm' },
    reviews: 10,
    forgotten: 3,
    forgetRate: 0.3,
    reviewShare: 1,
    averageDifficulty: 6.8,
    dueCount: 0,
    ...overrides,
  };
}

/** Số liệu Thống kê giả (SPEC-018). Mặc định: đã ôn, 30 ngày gần nhất, chưa có Topic nào. */
export function statsFixture(overrides: Partial<Stats> = {}): Stats {
  return {
    range: '30d',
    period: { from: '2026-08-26', to: '2026-09-24' },
    consistency: { reviewDays: 26, totalDays: 30, rate: 26 / 30 },
    streak: { current: 7, longest: 19 },
    durable: { cards: 38, totalCards: 91, share: 38 / 91 },
    recall: { remembered: 942, total: 1000, rate: 0.942, target: 0.9 },
    topics: [],
    week: [
      { date: '2026-09-21', reviews: 24 },
      { date: '2026-09-22', reviews: 32 },
      { date: '2026-09-23', reviews: 18 },
      { date: '2026-09-24', reviews: 46 },
      { date: '2026-09-25', reviews: 0 },
      { date: '2026-09-26', reviews: 0 },
      { date: '2026-09-27', reviews: 0 },
    ],
    ...overrides,
  };
}
