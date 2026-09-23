import type { InjectOptions } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import { OTHER_USER_ID, resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';
import { prismaCardListQuery } from '../../cards/infrastructure/prisma-card-list-query';
import { prismaCardRepository } from '../../cards/infrastructure/prisma-card-repository';
import { prismaSourceOwnership } from '../../cards/infrastructure/prisma-source-ownership';
import { registerCardsRoutes } from '../../cards/presentation/cards-routes';
import { prismaDueCardQuery } from '../../review/infrastructure/prisma-due-card-query';
import { prismaReviewRepository } from '../../review/infrastructure/prisma-review-repository';
import { registerReviewRoutes } from '../../review/presentation/review-routes';
import { startSession } from '../application/sessions';
import { prismaSessionRepository } from '../infrastructure/prisma-auth-repositories';
import { registerPrismaAuthRoutes } from '../../../shared/test/prisma-auth-routes';
import { prismaStreakQuery } from '../../review/infrastructure/prisma-streak-query';
import {
  prismaCardTopicRepository,
  prismaTopicRepository,
} from '../../topics/infrastructure/prisma-topic-repository';
import { registerTopicsRoutes } from '../../topics/presentation/topics-routes';
import { prismaTopicForgetRateQuery } from '../../topics/infrastructure/prisma-topic-forget-rate-query';

/**
 * TC-022 (BR-002, BR-008): user B cầm id dữ liệu của user A. Đi trọn đường thật
 * — cookie phiên → hook tra phiên → route → Prisma → Postgres — để chứng minh
 * userId luôn lấy từ phiên, và dữ liệu người khác bị đối xử như không tồn tại.
 */
const now = () => new Date();

function buildFullApp() {
  const app = buildApp();
  registerPrismaAuthRoutes(app);
  registerCardsRoutes(app, {
    cards: prismaCardRepository,
    cardList: prismaCardListQuery,
    sources: prismaSourceOwnership,
    topics: prismaTopicRepository,
    now,
  });
  registerReviewRoutes(app, {
    schedules: prismaDueCardQuery,
    reviews: prismaReviewRepository,
    streaks: prismaStreakQuery,
    now,
  });
  registerTopicsRoutes(app, {
    topics: prismaTopicRepository,
    cards: prismaCardTopicRepository,
    forgetRates: prismaTopicForgetRateQuery,
  });
  return app;
}

type App = ReturnType<typeof buildFullApp>;

async function sessionCookieFor(userId: string) {
  const { token } = await startSession({ sessions: prismaSessionRepository, now }, userId);
  return { retainly_session: token };
}

/** User A có một nguồn và một thẻ đến hạn hôm nay, tạo qua chính API. */
async function seedOwnerData(app: App, ownerCookies: Record<string, string>) {
  const source = await testPrisma.source.create({
    data: {
      userId: TEST_USER_ID,
      url: 'https://example.com/a',
      title: 'Nguồn của A',
      cleanText: 'Nội dung riêng của A',
    },
  });
  const created = await app.inject({
    method: 'POST',
    url: '/api/cards',
    cookies: ownerCookies,
    payload: {
      sourceId: source.id,
      front: 'Câu hỏi của A',
      back: 'Đáp án của A',
      note: 'Ghi chú của A',
    },
  });
  expect(created.statusCode).toBe(201);

  const topic = await app.inject({
    method: 'POST',
    url: '/api/topics',
    cookies: ownerCookies,
    payload: { name: 'Topic của A' },
  });
  expect(topic.statusCode).toBe(201);

  return {
    sourceId: source.id,
    cardId: created.json().id as string,
    topicId: topic.json().id as string,
  };
}

function snapshotOwnerRows() {
  return testPrisma.card.findMany({
    where: { userId: TEST_USER_ID },
    include: { schedule: true, outcomes: true },
  });
}

let app: App;
let ownerCookies: Record<string, string>;
let intruderCookies: Record<string, string>;
let owned: { sourceId: string; cardId: string; topicId: string };

beforeEach(async () => {
  await resetDatabase();
  app = buildFullApp();
  ownerCookies = await sessionCookieFor(TEST_USER_ID);
  intruderCookies = await sessionCookieFor(OTHER_USER_ID);
  owned = await seedOwnerData(app, ownerCookies);

  return () => app.close();
});

describe('E4-S1-T7 — TC-022 cô lập dữ liệu giữa các tài khoản', () => {
  it('đối chứng: chủ sở hữu thấy thẻ của mình trong danh sách và hàng đợi ôn', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/cards', cookies: ownerCookies });
    const due = await app.inject({ method: 'GET', url: '/api/cards/due', cookies: ownerCookies });

    expect(list.json().items.map((card: { id: string }) => card.id)).toEqual([owned.cardId]);
    expect(due.json().dueCount).toBe(1);
  });

  it.each<[string, (ids: typeof owned) => InjectOptions, string]>([
    [
      'PATCH /api/cards/:id',
      ({ cardId }) => ({
        method: 'PATCH',
        url: `/api/cards/${cardId}`,
        payload: { front: 'B sửa' },
      }),
      'ERR_CARD_NOT_FOUND',
    ],
    [
      'PATCH /api/cards/:id chỉ sửa ghi chú',
      ({ cardId }) => ({
        method: 'PATCH',
        url: `/api/cards/${cardId}`,
        payload: { note: null },
      }),
      'ERR_CARD_NOT_FOUND',
    ],
    [
      'DELETE /api/cards/:id',
      ({ cardId }) => ({ method: 'DELETE', url: `/api/cards/${cardId}` }),
      'ERR_CARD_NOT_FOUND',
    ],
    [
      'POST /api/review-outcomes',
      ({ cardId }) => ({
        method: 'POST',
        url: '/api/review-outcomes',
        payload: { cardId, outcome: 'forgotten' },
      }),
      'ERR_CARD_NOT_FOUND',
    ],
    [
      'POST /api/cards gắn nguồn của A',
      ({ sourceId }) => ({
        method: 'POST',
        url: '/api/cards',
        payload: { sourceId, front: 'Thẻ của B', back: 'Đáp án của B' },
      }),
      'ERR_SOURCE_NOT_FOUND',
    ],
  ])('%s bằng id của A trả 404, dữ liệu A giữ nguyên', async (_name, toRequest, code) => {
    const before = await snapshotOwnerRows();

    const res = await app.inject({ ...toRequest(owned), cookies: intruderCookies });

    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe(code);
    expect(await snapshotOwnerRows()).toEqual(before);
    expect(await testPrisma.card.count({ where: { userId: OTHER_USER_ID } })).toBe(0);
  });

  it('danh sách thẻ (kể cả lọc theo nguồn của A) và hàng đợi ôn của B không chứa gì của A', async () => {
    const all = await app.inject({ method: 'GET', url: '/api/cards', cookies: intruderCookies });
    const bySource = await app.inject({
      method: 'GET',
      url: `/api/cards?sourceId=${owned.sourceId}`,
      cookies: intruderCookies,
    });
    const due = await app.inject({
      method: 'GET',
      url: '/api/cards/due',
      cookies: intruderCookies,
    });

    expect(all.json().items).toEqual([]);
    expect(bySource.json().items).toEqual([]);
    expect(due.json()).toEqual({ dueCards: [], dueCount: 0 });
  });

  it('streak chỉ tính kết quả ôn tập của tài khoản đang đăng nhập', async () => {
    const reviewed = await app.inject({
      method: 'POST',
      url: '/api/review-outcomes',
      cookies: ownerCookies,
      payload: { cardId: owned.cardId, outcome: 'remembered' },
    });
    expect(reviewed.statusCode).toBe(200);

    const ownerStreak = await app.inject({
      method: 'GET',
      url: '/api/streak',
      cookies: ownerCookies,
    });
    const intruderStreak = await app.inject({
      method: 'GET',
      url: '/api/streak',
      cookies: intruderCookies,
    });

    expect(ownerStreak.json()).toEqual({ currentStreak: 1 });
    expect(intruderStreak.json()).toEqual({ currentStreak: 0 });
  });

  it('E8-S1-T1: B hoàn tác lượt ôn của A trả 404 ERR_OUTCOME_NOT_FOUND, dữ liệu A giữ nguyên', async () => {
    const reviewed = await app.inject({
      method: 'POST',
      url: '/api/review-outcomes',
      cookies: ownerCookies,
      payload: { cardId: owned.cardId, outcome: 'remembered' },
    });
    const url = `/api/review-outcomes/${reviewed.json().outcomeId}`;
    const before = await snapshotOwnerRows();

    const intruder = await app.inject({ method: 'DELETE', url, cookies: intruderCookies });

    expect(intruder.statusCode).toBe(404);
    expect(intruder.json().error.code).toBe('ERR_OUTCOME_NOT_FOUND');
    expect(await snapshotOwnerRows()).toEqual(before);

    // Đối chứng: chính A thì hoàn tác được, nên 404 ở trên là do cô lập dữ liệu.
    const owner = await app.inject({ method: 'DELETE', url, cookies: ownerCookies });
    expect(owner.statusCode).toBe(200);
  });

  it('danh sách topic của B không chứa topic của A', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics', cookies: intruderCookies });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ topics: [] });
  });

  it('báo cáo tỷ lệ quên của B không chứa nhánh kiến thức của A', async () => {
    const assigned = await app.inject({
      method: 'PATCH',
      url: `/api/cards/${owned.cardId}/topic`,
      cookies: ownerCookies,
      payload: { topicId: owned.topicId },
    });
    expect(assigned.statusCode).toBe(200);

    const reviewed = await app.inject({
      method: 'POST',
      url: '/api/review-outcomes',
      cookies: ownerCookies,
      payload: { cardId: owned.cardId, outcome: 'forgotten' },
    });
    expect(reviewed.statusCode).toBe(200);

    const ownerReport = await app.inject({
      method: 'GET',
      url: '/api/topics/forget-rate',
      cookies: ownerCookies,
    });
    const intruderReport = await app.inject({
      method: 'GET',
      url: '/api/topics/forget-rate',
      cookies: intruderCookies,
    });

    // Đối chứng: A thực sự có số liệu, nếu không thì vế rỗng của B vô nghĩa.
    expect(ownerReport.json().topics).toEqual([
      { topicId: owned.topicId, topicName: 'Topic của A', forgetRate: 1, totalReviews: 1 },
    ]);
    expect(intruderReport.json()).toEqual({ topics: [] });
  });

  it('B không thể gán topic của A, cũng không thể sửa card của A bằng topic của B', async () => {
    const foreignTopic = await app.inject({
      method: 'PATCH',
      url: `/api/cards/${owned.cardId}/topic`,
      cookies: intruderCookies,
      payload: { topicId: owned.topicId },
    });
    expect(foreignTopic.statusCode).toBe(404);
    expect(foreignTopic.json().error.code).toBe('ERR_TOPIC_NOT_FOUND');

    const intruderTopic = await app.inject({
      method: 'POST',
      url: '/api/topics',
      cookies: intruderCookies,
      payload: { name: 'Topic của B' },
    });
    expect(intruderTopic.statusCode).toBe(201);

    const foreignCard = await app.inject({
      method: 'PATCH',
      url: `/api/cards/${owned.cardId}/topic`,
      cookies: intruderCookies,
      payload: { topicId: intruderTopic.json().id },
    });
    expect(foreignCard.statusCode).toBe(404);
    expect(foreignCard.json().error.code).toBe('ERR_CARD_NOT_FOUND');

    await expect(
      testPrisma.card.findUniqueOrThrow({ where: { id: owned.cardId } }),
    ).resolves.toMatchObject({
      topicId: null,
    });
  });

  it.each<[string, (ids: typeof owned) => InjectOptions]>([
    ['GET /api/cards', () => ({ method: 'GET', url: '/api/cards' })],
    ['GET /api/cards/due', () => ({ method: 'GET', url: '/api/cards/due' })],
    ['GET /api/streak', () => ({ method: 'GET', url: '/api/streak' })],
    ['GET /api/topics', () => ({ method: 'GET', url: '/api/topics' })],
    ['GET /api/topics/forget-rate', () => ({ method: 'GET', url: '/api/topics/forget-rate' })],
    ['DELETE /api/cards/:id', ({ cardId }) => ({ method: 'DELETE', url: `/api/cards/${cardId}` })],
    [
      'DELETE /api/review-outcomes/:id',
      ({ cardId }) => ({ method: 'DELETE', url: `/api/review-outcomes/${cardId}` }),
    ],
  ])('%s không có phiên trả 401 ERR_UNAUTHORIZED', async (_name, toRequest) => {
    const res = await app.inject(toRequest(owned));

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
  });

  it('POST /api/review-outcomes với cardId sai định dạng trả 400, không phải 500', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/review-outcomes',
      cookies: ownerCookies,
      payload: { cardId: 'khong-phai-uuid', outcome: 'remembered' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
  });
});
