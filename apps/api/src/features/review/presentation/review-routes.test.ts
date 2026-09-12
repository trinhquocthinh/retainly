import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerReviewRoutes } from './review-routes';
import type { DueCard, DueCardQuery } from '../application/list-due-cards';

const NOW = new Date('2026-09-12T13:49:00Z');

function appWith(rows: DueCard[]) {
  const schedules: DueCardQuery = {
    async findDueBy() {
      return rows;
    },
  };
  const app = buildApp();
  registerReviewRoutes(app, { schedules, now: () => NOW });
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
