import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerCardsRoutes } from './cards-routes';
import type { CardRepository, SourceOwnership, TopicOwnership } from '../application/create-card';
import type { CardListQuery, CardListQueryInput } from '../application/list-cards';
import type { CardDeleteRepository } from '../application/delete-card';
import type { CardUpdateRepository } from '../application/update-card';
import { SIGNED_IN_USER_ID, signInAs } from '../../../shared/test/sign-in-as';

const NOW = new Date('2026-06-15T09:00:00Z');
const SOURCE = '00000000-0000-0000-0000-0000000000b1';
const CARD_ID = '00000000-0000-0000-0000-0000000000c1';
const TOPIC = '00000000-0000-0000-0000-0000000000a1';

type UpdateInput = Parameters<CardUpdateRepository['updateOwned']>[0];

type DeleteInput = Parameters<CardDeleteRepository['deleteOwned']>[0];

const updateInputs: UpdateInput[] = [];
const deleteInputs: DeleteInput[] = [];

const fakeCards: CardRepository & CardUpdateRepository & CardDeleteRepository = {
  async create(card) {
    return { id: 'card-1', createdAt: NOW, ...card };
  },

  async updateOwned(input) {
    updateInputs.push(input);

    return {
      id: input.cardId,
      sourceId: null,
      front: input.content.front ?? 'Câu hỏi cũ',
      back: input.content.back ?? 'Câu trả lời cũ',
      createdAt: NOW,
    };
  },

  async deleteOwned(input) {
    deleteInputs.push(input);
    return true;
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

function appWithCards(
  options: {
    sources?: SourceOwnership;
    topics?: TopicOwnership;
  } = {},
) {
  listInputs.length = 0;
  updateInputs.length = 0;
  deleteInputs.length = 0;

  const app = buildApp();
  signInAs(app);

  registerCardsRoutes(app, {
    cards: fakeCards,
    cardList: fakeCardList,
    sources: options.sources ?? { belongsToUser: async () => true },
    topics: options.topics ?? { belongsToUser: async () => true },
    now: () => NOW,
  });

  return app;
}

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
        userId: SIGNED_IN_USER_ID,
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
        userId: SIGNED_IN_USER_ID,
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

describe('E1-S2-T3 — POST /api/cards', () => {
  it('trả 201 kèm thẻ và lịch ôn mặc định', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: {
        front: '  Thủ đô Pháp?  ',
        back: ' Paris ',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      front: 'Thủ đô Pháp?',
      back: 'Paris',
      schedule: {
        state: 'new',
        intervalDays: 0,
      },
    });

    await app.close();
  });

  it('front rỗng trả 400 ERR_EMPTY_FRONT', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: {
        front: '   ',
        back: 'Paris',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_EMPTY_FRONT');

    await app.close();
  });

  it('thiếu trường bắt buộc trả 400 ERR_BAD_REQUEST', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: {
        front: 'Hỏi',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');

    await app.close();
  });

  it('E5-S1-T3: tạo thẻ cùng topic trong một request', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: {
        topicId: TOPIC,
        front: 'Hỏi',
        back: 'Đáp',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().topicId).toBe(TOPIC);

    await app.close();
  });

  it('E5-S1-T3: topic khác chủ trả ERR_TOPIC_NOT_FOUND và không tạo thẻ', async () => {
    const app = appWithCards({
      topics: { belongsToUser: async () => false },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: {
        topicId: TOPIC,
        front: 'Hỏi',
        back: 'Đáp',
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ERR_TOPIC_NOT_FOUND');

    await app.close();
  });

  it('E5-S1-T3: topicId sai định dạng trả ERR_BAD_REQUEST', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: {
        topicId: 'khong-phai-uuid',
        front: 'Hỏi',
        back: 'Đáp',
      },
    });

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
    const app = appWithCards({ sources: { belongsToUser: async () => false } });
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

describe('E3-S1-T2 — PATCH /api/cards/:id', () => {
  it('cập nhật từng phần và trả Card đã cập nhật', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/cards/${CARD_ID}`,
      payload: {
        front: '  Câu hỏi mới  ',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: CARD_ID,
      front: 'Câu hỏi mới',
      back: 'Câu trả lời cũ',
    });
    expect(updateInputs).toEqual([
      {
        userId: SIGNED_IN_USER_ID,
        cardId: CARD_ID,
        content: {
          front: 'Câu hỏi mới',
        },
      },
    ]);

    await app.close();
  });

  it('body rỗng trả ERR_BAD_REQUEST và không gọi repository', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/cards/${CARD_ID}`,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    expect(updateInputs).toHaveLength(0);

    await app.close();
  });

  it('front toàn khoảng trắng trả ERR_EMPTY_FRONT', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/cards/${CARD_ID}`,
      payload: {
        front: '   ',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_EMPTY_FRONT');
    expect(updateInputs).toHaveLength(0);

    await app.close();
  });

  it('card id sai định dạng trả ERR_BAD_REQUEST', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/cards/khong-phai-uuid',
      payload: {
        front: 'Câu hỏi mới',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    expect(updateInputs).toHaveLength(0);

    await app.close();
  });
});

describe('E3-S1-T2 — DELETE /api/cards/:id', () => {
  it('xóa card thuộc user và trả deleted true', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/cards/${CARD_ID}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ deleted: true });
    expect(deleteInputs).toEqual([
      {
        userId: SIGNED_IN_USER_ID,
        cardId: CARD_ID,
      },
    ]);

    await app.close();
  });

  it('card id sai định dạng trả ERR_BAD_REQUEST', async () => {
    const app = appWithCards();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/cards/khong-phai-uuid',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    expect(deleteInputs).toHaveLength(0);

    await app.close();
  });
});

describe('E4-S1-T3 — route thẻ yêu cầu đăng nhập', () => {
  it('không có phiên trả 401 ERR_UNAUTHORIZED và không chạm repository', async () => {
    listInputs.length = 0;
    const app = buildApp();
    registerCardsRoutes(app, {
      cards: fakeCards,
      cardList: fakeCardList,
      sources: { belongsToUser: async () => true },
      topics: { belongsToUser: async () => true },
      now: () => NOW,
    });

    const res = await app.inject({ method: 'GET', url: '/api/cards' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
    expect(listInputs).toEqual([]);

    await app.close();
  });
});
