import { describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import type { HomeOverviewQuery } from '../application/get-home-overview';
import { signInAs, SIGNED_IN_USER_ID } from '../../../shared/test/sign-in-as';
import { registerHomeRoutes } from './home-routes';

const NOW = new Date('2026-09-23T05:00:00Z');

function appWith(options: { signedIn: boolean }) {
  const users: string[] = [];
  const overview: HomeOverviewQuery = {
    async countTodayProgress(userId) {
      users.push(userId);
      return { reviewed: 1, total: 4 };
    },
    async summarizeLibrary() {
      return { totalCards: 4, topicCount: 1, difficultCards: 0 };
    },
    async countDueByTopic() {
      return [{ topic: { id: 'topic-1', name: 'FSRS' }, count: 3 }];
    },
    async findUpcoming() {
      return [
        {
          id: 'card-1',
          front: 'Hỏi',
          back: 'Đáp',
          topic: null,
          dueDate: new Date('2026-09-25T05:00:00Z'),
          reps: 1,
        },
      ];
    },
  };

  const app = buildApp();
  if (options.signedIn) signInAs(app);
  registerHomeRoutes(app, {
    overview,
    streaks: {
      async findReviewDaysBy() {
        return ['2026-09-23'];
      },
    },
    now: () => NOW,
  });

  return { app, users };
}

describe('E10-S1-T1 — GET /api/home/overview', () => {
  it('trả tổng quan của user đang đăng nhập, mốc thời gian dạng ISO', async () => {
    const { app, users } = appWith({ signedIn: true });

    const res = await app.inject({ method: 'GET', url: '/api/home/overview' });

    expect(res.statusCode).toBe(200);
    expect(users).toEqual([SIGNED_IN_USER_ID]);
    expect(res.json()).toMatchObject({
      todayProgress: { reviewed: 1, total: 4 },
      streak: { current: 1, longest: 1 },
      library: { totalCards: 4, topicCount: 1, difficultCards: 0 },
      dueByTopic: [{ topic: { id: 'topic-1', name: 'FSRS' }, count: 3 }],
      upcoming: [{ id: 'card-1', dueDate: '2026-09-25T05:00:00.000Z', reps: 1, topic: null }],
    });
    expect(res.json().streak.week).toHaveLength(7);
    await app.close();
  });

  it('không có phiên trả 401 ERR_UNAUTHORIZED', async () => {
    const { app, users } = appWith({ signedIn: false });

    const res = await app.inject({ method: 'GET', url: '/api/home/overview' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
    expect(users).toEqual([]);
    await app.close();
  });
});
