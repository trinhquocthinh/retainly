import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerCardsRoutes } from './cards-routes';
import type { CardRepository, SourceOwnership } from '../application/create-card';

const NOW = new Date('2026-06-15T09:00:00Z');
const SOURCE = '00000000-0000-0000-0000-0000000000b1';

const fakeCards: CardRepository = {
  async create(card) {
    return { id: 'card-1', createdAt: NOW, ...card };
  },
};

function appWithCards(sources: SourceOwnership = { belongsToUser: async () => true }) {
  const app = buildApp();
  registerCardsRoutes(app, { cards: fakeCards, sources, now: () => NOW });
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

describe('E2-S1-T4 — POST /api/cards kèm sourceId', () => {
  it('trả 201 và giữ nguyên sourceId trong DTO', async () => {
    const app = appWithCards();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { sourceId: SOURCE, front: 'Hỏi', back: 'Đáp' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().sourceId).toBe(SOURCE);
    await app.close();
  });

  it('nguồn không thuộc user trả 404 ERR_SOURCE_NOT_FOUND', async () => {
    const app = appWithCards({ belongsToUser: async () => false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { sourceId: SOURCE, front: 'Hỏi', back: 'Đáp' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ERR_SOURCE_NOT_FOUND');
    await app.close();
  });

  it('sourceId sai định dạng UUID trả 400 ERR_BAD_REQUEST', async () => {
    const app = appWithCards();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { sourceId: 'khong-phai-uuid', front: 'Hỏi', back: 'Đáp' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    await app.close();
  });
});
