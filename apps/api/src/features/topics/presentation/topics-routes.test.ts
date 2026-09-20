import { describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import { signInAs } from '../../../shared/test/sign-in-as';
import type { CardTopicRepository } from '../application/assign-topic-to-card';
import type { TopicRepository } from '../application/create-topic';
import { registerTopicsRoutes } from './topics-routes';
import { TopicForgetRate, TopicForgetRateQuery } from '../application/get-topic-forget-rates';

const CARD_ID = '00000000-0000-0000-0000-0000000000c1';
const TOPIC_ID = '00000000-0000-0000-0000-0000000000a1';
const CREATED_AT = new Date('2026-09-19T12:00:00.000Z');

function appWithTopics(
  options: { signedIn?: boolean; duplicate?: boolean; forgetRates?: TopicForgetRate[] } = {},
) {
  const topics: TopicRepository = {
    async create(input) {
      if (options.duplicate === true) return null;
      return { id: TOPIC_ID, name: input.name, createdAt: CREATED_AT };
    },
    async listByUser() {
      return [{ id: TOPIC_ID, name: 'Khoa học', createdAt: CREATED_AT }];
    },
    async belongsToUser() {
      return true;
    },
  };
  const cards: CardTopicRepository = {
    async assignOwned(input) {
      return {
        id: input.cardId,
        sourceId: null,
        topicId: input.topicId,
        front: 'Hỏi',
        back: 'Đáp',
        createdAt: CREATED_AT,
      };
    },
  };

  const forgetRates: TopicForgetRateQuery = {
    async findByUser() {
      return options.forgetRates ?? [];
    },
  };

  const app = buildApp();
  if (options.signedIn !== false) signInAs(app);
  registerTopicsRoutes(app, { topics, cards, forgetRates });
  return app;
}

describe('E5-S1-T2 — topic routes', () => {
  it('POST /api/topics tạo topic cho user trong phiên', async () => {
    const app = appWithTopics();

    const res = await app.inject({
      method: 'POST',
      url: '/api/topics',
      payload: { name: '  Khoa học  ' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: TOPIC_ID,
      name: 'Khoa học',
      createdAt: CREATED_AT.toISOString(),
    });
    await app.close();
  });

  it('POST /api/topics với tên trùng trả 409 ERR_TOPIC_NAME_TAKEN', async () => {
    const app = appWithTopics({ duplicate: true });

    const res = await app.inject({
      method: 'POST',
      url: '/api/topics',
      payload: { name: 'Khoa học' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ERR_TOPIC_NAME_TAKEN');
    await app.close();
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'POST /api/topics từ chối tên không hợp lệ',
    async (name) => {
      const app = appWithTopics();

      const res = await app.inject({ method: 'POST', url: '/api/topics', payload: { name } });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
      await app.close();
    },
  );

  it('GET /api/topics trả danh sách topic của user', async () => {
    const app = appWithTopics();

    const res = await app.inject({ method: 'GET', url: '/api/topics' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      topics: [{ id: TOPIC_ID, name: 'Khoa học', createdAt: CREATED_AT.toISOString() }],
    });
    await app.close();
  });

  it.each<[string | null]>([[TOPIC_ID], [null]])(
    'PATCH /api/cards/:id/topic chấp nhận topicId %s',
    async (topicId) => {
      const app = appWithTopics();

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/cards/${CARD_ID}/topic`,
        payload: { topicId },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().topicId).toBe(topicId);
      await app.close();
    },
  );

  it.each([
    { url: '/api/cards/khong-phai-uuid/topic', payload: { topicId: TOPIC_ID } },
    { url: `/api/cards/${CARD_ID}/topic`, payload: { topicId: 'khong-phai-uuid' } },
    { url: `/api/cards/${CARD_ID}/topic`, payload: {} },
  ])('PATCH /api/cards/:id/topic từ chối request sai schema', async ({ url, payload }) => {
    const app = appWithTopics();

    const res = await app.inject({ method: 'PATCH', url, payload });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    await app.close();
  });

  it.each([
    { method: 'POST' as const, url: '/api/topics', payload: { name: 'Khoa học' } },
    { method: 'GET' as const, url: '/api/topics' },
    { method: 'GET' as const, url: '/api/topics/forget-rate' },
    {
      method: 'PATCH' as const,
      url: `/api/cards/${CARD_ID}/topic`,
      payload: { topicId: TOPIC_ID },
    },
  ])('$method $url không có phiên trả 401', async (request) => {
    const app = appWithTopics({ signedIn: false });

    const res = await app.inject(request);

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
    await app.close();
  });

  it('GET /api/topics/forget-rate trả tỷ lệ quên theo topic', async () => {
    const app = appWithTopics({
      forgetRates: [
        {
          topicId: TOPIC_ID,
          topicName: 'Khoa học',
          forgetRate: 0.3,
          totalReviews: 10,
        },
      ],
    });

    const res = await app.inject({ method: 'GET', url: '/api/topics/forget-rate' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      topics: [
        {
          topicId: TOPIC_ID,
          topicName: 'Khoa học',
          forgetRate: 0.3,
          totalReviews: 10,
        },
      ],
    });
    await app.close();
  });
});
