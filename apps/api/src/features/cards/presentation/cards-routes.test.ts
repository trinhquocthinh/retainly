import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerCardsRoutes } from './cards-routes';
import type { CardRepository } from '../application/create-card';

const NOW = new Date('2026-06-15T09:00:00Z');

const fakeCards: CardRepository = {
  async create(card) {
    return { id: 'card-1', createdAt: NOW, ...card };
  },
};

function appWithCards() {
  const app = buildApp();
  registerCardsRoutes(app, { cards: fakeCards, now: () => NOW });
  return app;
}

describe('E1-S2-T3 — POST /api/cards', () => {
  it('trả 201 kèm thẻ và lịch ôn mặc định', async () => {
    const app = appWithCards();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { front: '  Thủ đô Pháp?  ', back: ' Paris ' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      front: 'Thủ đô Pháp?',
      back: 'Paris',
      schedule: { state: 'new', intervalDays: 0 },
    });
    await app.close();
  });

  it('front rỗng trả 400 ERR_EMPTY_FRONT', async () => {
    const app = appWithCards();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { front: '   ', back: 'Paris' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_EMPTY_FRONT');
    await app.close();
  });

  it('thiếu trường bắt buộc trả 400 ERR_BAD_REQUEST', async () => {
    const app = appWithCards();
    const res = await app.inject({ method: 'POST', url: '/api/cards', payload: { front: 'Hỏi' } });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    await app.close();
  });
});
