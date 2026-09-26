import { describe, expect, it } from 'vitest';

import type { StreakQuery } from './get-current-streak';
import {
  DIFFICULT_CARD_THRESHOLD,
  getHomeOverview,
  UPCOMING_LIMIT,
  type HomeOverviewQuery,
} from './get-home-overview';

// 12:00 Thứ Tư 23/09 tại Việt Nam.
const NOW = new Date('2026-09-23T05:00:00Z');
const START_OF_TODAY = new Date('2026-09-22T17:00:00.000Z');
const END_OF_TODAY = new Date('2026-09-23T16:59:59.999Z');
const USER = '00000000-0000-0000-0000-000000000001';

const UPCOMING = {
  id: 'card-1',
  front: 'Hỏi',
  back: 'Đáp',
  topic: { id: 'topic-1', name: 'FSRS' },
  dueDate: new Date('2026-09-26T05:00:00Z'),
  reps: 2,
};

function fakes() {
  const calls: unknown[][] = [];
  const overview: HomeOverviewQuery = {
    async countTodayProgress(...args) {
      calls.push(['countTodayProgress', ...args]);
      return { reviewed: 3, total: 8 };
    },
    async summarizeLibrary(...args) {
      calls.push(['summarizeLibrary', ...args]);
      return { totalCards: 20, topicCount: 2, difficultCards: 1 };
    },
    async countDueByTopic(...args) {
      calls.push(['countDueByTopic', ...args]);
      return [{ topic: null, count: 5 }];
    },
    async findUpcoming(...args) {
      calls.push(['findUpcoming', ...args]);
      return [UPCOMING];
    },
  };
  const streaks: StreakQuery = {
    async findReviewDaysBy(userId) {
      calls.push(['findReviewDaysBy', userId]);
      return ['2026-09-23', '2026-09-21', '2026-09-15', '2026-09-14', '2026-09-13'];
    },
  };

  return { calls, deps: { overview, streaks, now: () => NOW } };
}

describe('E10-S1-T1 — tổng quan Trang chủ', () => {
  it('gọi mọi truy vấn cho đúng user với mốc ngày Việt Nam, ngưỡng độ khó và giới hạn', async () => {
    const { calls, deps } = fakes();

    await getHomeOverview(deps, { userId: USER });

    expect(calls).toEqual(
      expect.arrayContaining([
        ['countTodayProgress', USER, { reviewedSince: START_OF_TODAY, dueBy: END_OF_TODAY }],
        ['summarizeLibrary', USER, DIFFICULT_CARD_THRESHOLD],
        ['countDueByTopic', USER, END_OF_TODAY],
        ['findUpcoming', USER, { dueAfter: END_OF_TODAY, limit: UPCOMING_LIMIT }],
        ['findReviewDaysBy', USER],
      ]),
    );
    expect(calls).toHaveLength(5);
  });

  it('ghép số liệu của tầng dưới với chuỗi hiện tại, kỷ lục và dải tuần', async () => {
    const { deps } = fakes();

    const result = await getHomeOverview(deps, { userId: USER });

    expect(result).toEqual({
      todayProgress: { reviewed: 3, total: 8 },
      streak: {
        current: 2,
        longest: 3,
        week: [
          { date: '2026-09-21', reviewed: true },
          { date: '2026-09-22', reviewed: false },
          { date: '2026-09-23', reviewed: true },
          { date: '2026-09-24', reviewed: false },
          { date: '2026-09-25', reviewed: false },
          { date: '2026-09-26', reviewed: false },
          { date: '2026-09-27', reviewed: false },
        ],
      },
      library: { totalCards: 20, topicCount: 2, difficultCards: 1 },
      dueByTopic: [{ topic: null, count: 5 }],
      upcoming: [UPCOMING],
    });
  });
});
