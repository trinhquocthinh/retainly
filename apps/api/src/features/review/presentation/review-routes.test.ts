import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerReviewRoutes } from './review-routes';
import type { StreakQuery } from '../application/get-current-streak';
import type { DueCard, DueCardQuery } from '../application/list-due-cards';
import type { ReviewRepository } from '../application/record-outcome';
import { signInAs } from '../../../shared/test/sign-in-as';

const NOW = new Date('2026-09-12T13:49:00Z');

function appWith(rows: DueCard[], reviewDays: string[] = []) {
  const schedules: DueCardQuery = {
    async findDueBy() {
      return rows;
    },
  };

  // GET /api/cards/due không được chạm tới cổng này. Ném lỗi thay vì trả giá trị
  // rỗng: nếu route lỡ gọi tới, test phải đỏ chứ không im lặng đi tiếp.
  const reviews: ReviewRepository = {
    findScheduleFor() {
      throw new Error('GET /api/cards/due không được đọc lịch ôn');
    },
    save() {
      throw new Error('GET /api/cards/due không được ghi gì');
    },
  };

  const streaks: StreakQuery = {
    async findReviewDaysBy() {
      return reviewDays;
    },
  };

  const app = buildApp();
  signInAs(app);

  registerReviewRoutes(app, { schedules, reviews, streaks, now: () => NOW });
  return app;
}

describe('E1-S2-T4 — GET /api/cards/due', () => {
  it('TC-009: không có thẻ đến hạn trả dueCount=0', async () => {
    const app = appWith([]);
    const res = await app.inject({ method: 'GET', url: '/api/cards/due' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ dueCards: [], dueCount: 0 });
    await app.close();
  });

  it('trả đúng số thẻ và giữ nguyên thứ tự của tầng dưới', async () => {
    const app = appWith([
      { id: 'a', front: 'Hỏi A', back: 'Đáp A', note: null, dueDate: NOW },
      { id: 'b', front: 'Hỏi B', back: 'Đáp B', note: null, dueDate: NOW },
    ]);
    const res = await app.inject({ method: 'GET', url: '/api/cards/due' });

    expect(res.json().dueCount).toBe(2);
    expect(res.json().dueCards.map((c: DueCard) => c.id)).toEqual(['a', 'b']);
    await app.close();
  });
});

describe('E5-S1-T1 — GET /api/streak', () => {
  it('GET /api/streak trả currentStreak của người dùng hiện tại', async () => {
    const app = appWith([], ['2026-09-12', '2026-09-10']);

    const res = await app.inject({ method: 'GET', url: '/api/streak' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ currentStreak: 2 });
    await app.close();
  });

  it('GET /api/streak không có phiên trả 401 ERR_UNAUTHORIZED', async () => {
    const app = buildApp();

    // Không cài hook signInAs lên app này.
    registerReviewRoutes(app, {
      schedules: {
        async findDueBy() {
          return [];
        },
      },
      reviews: {
        async findScheduleFor() {
          return null;
        },
        async save() {},
      },
      streaks: {
        async findReviewDaysBy() {
          return [];
        },
      },
      now: () => NOW,
    });

    const res = await app.inject({ method: 'GET', url: '/api/streak' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
    await app.close();
  });
});
