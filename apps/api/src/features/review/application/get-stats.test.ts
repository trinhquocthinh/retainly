import { describe, expect, it } from 'vitest';

import { MASTERED_STABILITY_DAYS } from '../../cards/domain/library-stats';
import type { StreakQuery } from './get-current-streak';
import { getStats, type StatsQuery, type TopicStatsRow } from './get-stats';

// 12:00 Thứ Năm 24/09 tại Việt Nam.
const NOW = new Date('2026-09-24T05:00:00Z');
const RECENT_START = new Date('2026-08-25T17:00:00.000Z');
const WEEK_START = new Date('2026-09-20T17:00:00.000Z');
const END_OF_TODAY = new Date('2026-09-24T16:59:59.999Z');
const USER = '00000000-0000-0000-0000-000000000001';

const TOPICS: TopicStatsRow[] = [
  {
    topic: { id: 'topic-1', name: 'Kiến trúc' },
    reviews: 30,
    forgotten: 6,
    forgetRate: 0.2,
    averageDifficulty: 6.8,
    dueCount: 3,
  },
  {
    topic: { id: 'topic-2', name: 'FSRS' },
    reviews: 10,
    forgotten: 1,
    forgetRate: 0.1,
    averageDifficulty: 4.2,
    dueCount: 0,
  },
];

function fakes(options: { topics?: TopicStatsRow[]; outcomes?: number } = {}) {
  const calls: unknown[][] = [];
  const total = options.outcomes ?? 50;
  const stats: StatsQuery = {
    async countOutcomes(...args) {
      calls.push(['countOutcomes', ...args]);
      return { remembered: total === 0 ? 0 : 47, total };
    },
    async countReviewsByDay(...args) {
      calls.push(['countReviewsByDay', ...args]);
      return [{ date: '2026-09-24', reviews: 5 }];
    },
    async countDurable(...args) {
      calls.push(['countDurable', ...args]);
      return { cards: 38, totalCards: 100 };
    },
    async summarizeTopics(...args) {
      calls.push(['summarizeTopics', ...args]);
      return options.topics ?? TOPICS;
    },
  };
  const streaks: StreakQuery = {
    async findReviewDaysBy(userId) {
      calls.push(['findReviewDaysBy', userId]);
      return ['2026-09-24', '2026-09-23', '2026-09-10', '2026-09-09', '2026-09-08'];
    },
  };

  return { calls, deps: { stats, streaks, now: () => NOW } };
}

describe('E10-S1-T3 — số liệu màn Thống kê', () => {
  it('30 ngày: lọc lượt ôn từ đầu ngày 26/08, tuần từ Thứ Hai, ngưỡng S của thẻ đã thuộc', async () => {
    const { calls, deps } = fakes();

    await getStats(deps, { userId: USER, range: '30d' });

    expect(calls).toEqual(
      expect.arrayContaining([
        ['findReviewDaysBy', USER],
        ['countOutcomes', USER, RECENT_START],
        ['countDurable', USER, MASTERED_STABILITY_DAYS],
        ['summarizeTopics', USER, { since: RECENT_START, dueBy: END_OF_TODAY }],
        ['countReviewsByDay', USER, WEEK_START],
      ]),
    );
    expect(calls).toHaveLength(5);
  });

  it('toàn bộ: không chặn dưới lượt ôn, tuần vẫn là tuần hiện tại', async () => {
    const { calls, deps } = fakes();

    const result = await getStats(deps, { userId: USER, range: 'all' });

    expect(calls).toEqual(
      expect.arrayContaining([
        ['countOutcomes', USER, null],
        ['summarizeTopics', USER, { since: null, dueBy: END_OF_TODAY }],
        ['countReviewsByDay', USER, WEEK_START],
      ]),
    );
    expect(result.period).toEqual({ from: '2026-09-08', to: '2026-09-24' });
    expect(result.consistency).toEqual({ reviewDays: 5, totalDays: 17, rate: 5 / 17 });
  });

  it('ghép tỷ lệ, chuỗi, vùng bền vững, mục tiêu FSRS và tỷ trọng lượt ôn theo Topic', async () => {
    const { deps } = fakes();

    const result = await getStats(deps, { userId: USER, range: '30d' });

    expect(result).toMatchObject({
      range: '30d',
      period: { from: '2026-08-26', to: '2026-09-24' },
      consistency: { reviewDays: 5, totalDays: 30 },
      streak: { current: 2, longest: 3 },
      durable: { cards: 38, totalCards: 100, share: 0.38 },
      recall: { remembered: 47, total: 50, rate: 0.94, target: 0.9 },
      topics: [
        { topic: { id: 'topic-1' }, reviewShare: 0.75 },
        { topic: { id: 'topic-2' }, reviewShare: 0.25 },
      ],
    });
    expect(result.week).toHaveLength(7);
    expect(result.week[3]).toEqual({ date: '2026-09-24', reviews: 5 });
  });

  it('chưa có lượt ôn nào trong khoảng: tỷ lệ nhớ lại null, danh sách Topic rỗng', async () => {
    const { deps } = fakes({ topics: [], outcomes: 0 });

    const result = await getStats(deps, { userId: USER, range: '30d' });

    expect(result.recall).toEqual({ remembered: 0, total: 0, rate: null, target: 0.9 });
    expect(result.topics).toEqual([]);
  });
});
