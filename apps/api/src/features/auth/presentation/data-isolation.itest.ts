import type { InjectOptions } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import { OTHER_USER_ID, resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';
import { prismaCardListQuery } from '../../cards/infrastructure/prisma-card-list-query';
import { prismaLibraryScheduleQuery } from '../../cards/infrastructure/prisma-library-schedule-query';
import { prismaCardRepository } from '../../cards/infrastructure/prisma-card-repository';
import { prismaSourceOwnership } from '../../cards/infrastructure/prisma-source-ownership';
import { registerCardsRoutes } from '../../cards/presentation/cards-routes';
import { prismaDueCardQuery } from '../../review/infrastructure/prisma-due-card-query';
import { prismaHomeOverviewQuery } from '../../review/infrastructure/prisma-home-overview-query';
import { prismaReviewRepository } from '../../review/infrastructure/prisma-review-repository';
import { registerReviewRoutes } from '../../review/presentation/review-routes';
import { registerHomeRoutes } from '../../review/presentation/home-routes';
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
    libraryStats: prismaLibraryScheduleQuery,
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
  registerHomeRoutes(app, { overview: prismaHomeOverviewQuery, streaks: prismaStreakQuery, now });
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

/** A ghi một lượt ôn cho thẻ của mình qua chính API. */
async function ownerReviews(outcome: 'remembered' | 'forgotten') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/review-outcomes',
    cookies: ownerCookies,
    payload: { cardId: owned.cardId, outcome },
  });
  expect(res.statusCode).toBe(200);
  return res;
}

/** A gán Topic của mình cho thẻ của mình qua chính API. */
async function ownerAssignsTopic() {
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/cards/${owned.cardId}/topic`,
    cookies: ownerCookies,
    payload: { topicId: owned.topicId },
  });
  expect(res.statusCode).toBe(200);
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

  it('E9-S1-T1: tìm kiếm, lọc Topic của A và số đếm theo Topic của B không chứa gì của A', async () => {
    await ownerAssignsTopic();
    // Từ khoá không dấu khớp "Câu hỏi của A" — đối chứng A tìm thấy thẻ của mình.
    const url = `/api/cards?q=cau%20hoi&topic=${owned.topicId}`;

    const ownerView = await app.inject({ method: 'GET', url, cookies: ownerCookies });
    const intruderView = await app.inject({ method: 'GET', url, cookies: intruderCookies });

    expect(ownerView.json().items.map((card: { id: string }) => card.id)).toEqual([owned.cardId]);
    expect(intruderView.json()).toMatchObject({
      items: [],
      pagination: { totalItems: 0 },
      topicCounts: { all: 0, unassigned: 0, topics: [] },
    });
  });

  it('E9-S1-T3: số liệu Thư viện của B không tính thẻ của A', async () => {
    await ownerReviews('remembered');

    const owner = await app.inject({
      method: 'GET',
      url: '/api/cards/stats',
      cookies: ownerCookies,
    });
    const intruder = await app.inject({
      method: 'GET',
      url: '/api/cards/stats',
      cookies: intruderCookies,
    });

    // Đối chứng: A thấy đúng một thẻ đã ôn của mình.
    expect(owner.json()).toMatchObject({ totalCards: 1, reviewedCards: 1 });
    expect(intruder.json()).toEqual({
      totalCards: 0,
      dueToday: 0,
      overdue: 0,
      reviewedCards: 0,
      averageRetrievability: null,
      averageStability: null,
      masteredCards: 0,
    });
  });

  it('streak chỉ tính kết quả ôn tập của tài khoản đang đăng nhập', async () => {
    await ownerReviews('remembered');

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

  it('E10-S1-T1: tổng quan Trang chủ của B không tính thẻ, Topic hay lượt ôn của A', async () => {
    await ownerAssignsTopic();
    await ownerReviews('remembered');

    const owner = await app.inject({
      method: 'GET',
      url: '/api/home/overview',
      cookies: ownerCookies,
    });
    const intruder = await app.inject({
      method: 'GET',
      url: '/api/home/overview',
      cookies: intruderCookies,
    });

    // Đối chứng: A thấy thẻ đã ôn, Topic và lịch sắp tới của mình.
    expect(owner.json()).toMatchObject({
      todayProgress: { reviewed: 1, total: 1 },
      streak: { current: 1, longest: 1 },
      library: { totalCards: 1, topicCount: 1 },
      upcoming: [{ id: owned.cardId }],
    });
    expect(intruder.json()).toMatchObject({
      todayProgress: { reviewed: 0, total: 0 },
      streak: { current: 0, longest: 0 },
      library: { totalCards: 0, topicCount: 0, difficultCards: 0 },
      dueByTopic: [],
      upcoming: [],
    });
    expect(intruder.json().streak.week.some((day: { reviewed: boolean }) => day.reviewed)).toBe(
      false,
    );
  });

  it('E8-S1-T1: B hoàn tác lượt ôn của A trả 404 ERR_OUTCOME_NOT_FOUND, dữ liệu A giữ nguyên', async () => {
    const reviewed = await ownerReviews('remembered');
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

  it('E8-S1-T3: Ôn thêm của B không chứa thẻ của A', async () => {
    await ownerReviews('remembered');
    // Lùi lượt ôn về hôm kia: thẻ vừa ôn hôm nay không thuộc diện Ôn thêm.
    await testPrisma.reviewOutcome.updateMany({
      where: { cardId: owned.cardId },
      data: { reviewedAt: new Date(Date.now() - 2 * 86_400_000) },
    });

    const owner = await app.inject({
      method: 'GET',
      url: '/api/cards/extra',
      cookies: ownerCookies,
    });
    const intruder = await app.inject({
      method: 'GET',
      url: '/api/cards/extra',
      cookies: intruderCookies,
    });

    // Đối chứng: A thực sự có thẻ Ôn thêm, nếu không thì vế rỗng của B vô nghĩa.
    expect(owner.json().extraCards.map((card: { id: string }) => card.id)).toEqual([owned.cardId]);
    expect(intruder.json()).toEqual({ extraCards: [] });
  });

  it('danh sách topic của B không chứa topic của A', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics', cookies: intruderCookies });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ topics: [] });
  });

  it('báo cáo tỷ lệ quên của B không chứa nhánh kiến thức của A', async () => {
    await ownerAssignsTopic();

    await ownerReviews('forgotten');

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
    ['GET /api/cards/stats', () => ({ method: 'GET', url: '/api/cards/stats' })],
    ['GET /api/cards/extra', () => ({ method: 'GET', url: '/api/cards/extra' })],
    ['GET /api/streak', () => ({ method: 'GET', url: '/api/streak' })],
    ['GET /api/home/overview', () => ({ method: 'GET', url: '/api/home/overview' })],
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
