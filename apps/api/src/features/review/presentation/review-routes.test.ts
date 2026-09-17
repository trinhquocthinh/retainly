import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerReviewRoutes } from './review-routes';
import type { DueCard, DueCardQuery } from '../application/list-due-cards';
import type { ReviewRepository } from '../application/record-outcome';
import { signInAs } from '../../../shared/test/sign-in-as';

const NOW = new Date('2026-09-12T13:49:00Z');

function appWith(rows: DueCard[]) {
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

  const app = buildApp();
  signInAs(app);

  registerReviewRoutes(app, { schedules, reviews, now: () => NOW });
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
      { id: 'a', front: 'Hỏi A', back: 'Đáp A', dueDate: NOW },
      { id: 'b', front: 'Hỏi B', back: 'Đáp B', dueDate: NOW },
    ]);
    const res = await app.inject({ method: 'GET', url: '/api/cards/due' });

    expect(res.json().dueCount).toBe(2);
    expect(res.json().dueCards.map((c: DueCard) => c.id)).toEqual(['a', 'b']);
    await app.close();
  });
});
