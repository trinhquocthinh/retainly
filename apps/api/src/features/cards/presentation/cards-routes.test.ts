import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerCardsRoutes } from './cards-routes';
import type { CardRepository, SourceOwnership } from '../application/create-card';
import type { CardListQuery, CardListQueryInput } from '../application/list-cards';
import { DEFAULT_USER_ID } from '../../../shared/default-user';

const NOW = new Date('2026-06-15T09:00:00Z');
const SOURCE = '00000000-0000-0000-0000-0000000000b1';

const fakeCards: CardRepository = {
  async create(card) {
    return { id: 'card-1', createdAt: NOW, ...card };
  },
};

const listInputs: CardListQueryInput[] = [];

const fakeCardList: CardListQuery = {
  async list(input) {
    listInputs.push(input);
    return {
      items: [],
      totalItems: 21,
    };
  },
};

function appWithCards(sources: SourceOwnership = { belongsToUser: async () => true }) {
  listInputs.length = 0;

  const app = buildApp();
  registerCardsRoutes(app, {
    cards: fakeCards,
    cardList: fakeCardList,
    sources,
    now: () => NOW,
  });

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

describe('E3-S1-T1 — GET /api/cards', () => {
  it('dùng mặc định page=1 và pageSize=20', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'GET',
      url: '/api/cards',
    });

    expect(res.statusCode).toBe(200);
    expect(listInputs).toEqual([
      {
        userId: DEFAULT_USER_ID,
        page: 1,
        pageSize: 20,
        sourceId: undefined,
      },
    ]);
    expect(res.json().pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 21,
      totalPages: 2,
    });

    await app.close();
  });

  it('truyền page, pageSize và sourceId hợp lệ', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'GET',
      url: `/api/cards?page=2&pageSize=10&sourceId=${SOURCE}`,
    });

    expect(res.statusCode).toBe(200);
    expect(listInputs).toEqual([
      {
        userId: DEFAULT_USER_ID,
        page: 2,
        pageSize: 10,
        sourceId: SOURCE,
      },
    ]);

    await app.close();
  });

  it.each([
    '?page=0',
    '?page=1.5',
    '?pageSize=0',
    '?pageSize=101',
    '?pageSize=abc',
    '?sourceId=khong-phai-uuid',
  ])('query không hợp lệ %s trả ERR_BAD_REQUEST', async (query) => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'GET',
      url: `/api/cards${query}`,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    expect(listInputs).toHaveLength(0);

    await app.close();
  });
});
