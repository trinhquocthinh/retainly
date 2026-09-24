import { describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import type { StatsQuery } from '../application/get-stats';
import { signInAs, SIGNED_IN_USER_ID } from '../../../shared/test/sign-in-as';
import { registerStatsRoutes } from './stats-routes';

const NOW = new Date('2026-09-24T05:00:00Z');

function appWith(options: { signedIn: boolean }) {
  const calls: { userId: string; since: Date | null }[] = [];
  const stats: StatsQuery = {
    async countOutcomes(userId, since) {
      calls.push({ userId, since });
      return { remembered: 9, total: 10 };
    },
    async countReviewsByDay() {
      return [];
    },
    async countDurable() {
      return { cards: 1, totalCards: 4 };
    },
    async summarizeTopics() {
      return [
        {
          topic: { id: 'topic-1', name: 'FSRS' },
          reviews: 10,
          forgotten: 1,
          forgetRate: 0.1,
          averageDifficulty: 5,
          dueCount: 2,
        },
      ];
    },
  };

  const app = buildApp();
  if (options.signedIn) signInAs(app);
  registerStatsRoutes(app, {
    stats,
    streaks: {
      async findReviewDaysBy() {
        return ['2026-09-24'];
      },
    },
    now: () => NOW,
  });

  return { app, calls };
}

describe('E10-S1-T3 — GET /api/stats', () => {
  it('mặc định 30 ngày, trả số liệu của user đang đăng nhập', async () => {
    const { app, calls } = appWith({ signedIn: true });

    const res = await app.inject({ method: 'GET', url: '/api/stats' });

    expect(res.statusCode).toBe(200);
    expect(calls).toEqual([
      { userId: SIGNED_IN_USER_ID, since: new Date('2026-08-25T17:00:00.000Z') },
    ]);
    expect(res.json()).toMatchObject({
      range: '30d',
      period: { from: '2026-08-26', to: '2026-09-24' },
      consistency: { reviewDays: 1, totalDays: 30 },
      streak: { current: 1, longest: 1 },
      durable: { cards: 1, totalCards: 4, share: 0.25 },
      recall: { remembered: 9, total: 10, rate: 0.9, target: 0.9 },
      topics: [{ topic: { id: 'topic-1', name: 'FSRS' }, reviewShare: 1, dueCount: 2 }],
    });
    expect(res.json().week).toHaveLength(7);
    await app.close();
  });

  it('range=all không chặn dưới lượt ôn', async () => {
    const { app, calls } = appWith({ signedIn: true });

    const res = await app.inject({ method: 'GET', url: '/api/stats?range=all' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ range: 'all', period: { from: '2026-09-24' } });
    expect(calls).toEqual([{ userId: SIGNED_IN_USER_ID, since: null }]);
    await app.close();
  });

  it('range ngoài 30d/all trả 400 ERR_BAD_REQUEST, không chạm tới truy vấn', async () => {
    const { app, calls } = appWith({ signedIn: true });

    const res = await app.inject({ method: 'GET', url: '/api/stats?range=7d' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    expect(calls).toEqual([]);
    await app.close();
  });

  it('không có phiên trả 401 ERR_UNAUTHORIZED', async () => {
    const { app, calls } = appWith({ signedIn: false });

    const res = await app.inject({ method: 'GET', url: '/api/stats' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
    expect(calls).toEqual([]);
    await app.close();
  });
});
