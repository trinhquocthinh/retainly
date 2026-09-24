import { describe, it, expect } from 'vitest';

import { buildApp } from '../../../app';
import { registerReviewRoutes } from './review-routes';
import type { StreakQuery } from '../application/get-current-streak';
import type { DueCardQuery, QueueCard, ScheduledCard } from '../application/list-due-cards';
import type { ReviewRepository } from '../application/review-repository';
import { createInitialSchedule } from '../domain/review-scheduler';
import { inMemoryReviews } from '../../../shared/test/in-memory-review';
import { SIGNED_IN_USER_ID, signInAs } from '../../../shared/test/sign-in-as';

const NOW = new Date('2026-09-12T13:49:00Z');

// Các route đọc không được chạm tới cổng này. Ném lỗi thay vì trả giá trị rỗng:
// nếu route lỡ gọi tới, test phải đỏ chứ không im lặng đi tiếp.
const throwingReviews: ReviewRepository = {
  inTransaction() {
    throw new Error('route đọc không được mở transaction ghi lịch ôn');
  },
};

const CARD = '11111111-1111-1111-1111-111111111111';
const UNKNOWN_OUTCOME = '22222222-2222-2222-2222-222222222222';
const TOPIC = '33333333-3333-3333-3333-333333333333';

function queued(id: string): ScheduledCard {
  return {
    card: { id, front: `Hỏi ${id}`, back: `Đáp ${id}`, note: null, dueDate: NOW },
    schedule: createInitialSchedule(NOW),
  };
}

const NEW_CARD_MEMORY = {
  stability: 0,
  difficulty: 0,
  retrievability: 0,
  lastReviewedAt: null,
  forecastDays: { remembered: 3, forgotten: 1 },
};

function appWith(
  rows: ScheduledCard[],
  reviewDays: string[] = [],
  reviews: ReviewRepository = throwingReviews,
  extras: ScheduledCard[] = [],
  dueTopics: (string | undefined)[] = [],
) {
  const schedules: DueCardQuery = {
    async findDueBy(_userId, _cutoff, topicId) {
      dueTopics.push(topicId);
      return rows;
    },
    async findExtraCandidates() {
      return extras;
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
    const app = appWith([queued('a'), queued('b')]);
    const res = await app.inject({ method: 'GET', url: '/api/cards/due' });

    expect(res.json().dueCount).toBe(2);
    expect(res.json().dueCards.map((c: QueueCard) => c.id)).toEqual(['a', 'b']);
    await app.close();
  });

  it('E10-S1-T3: ?topicId= chỉ lấy hàng đợi của Topic đó', async () => {
    const dueTopics: (string | undefined)[] = [];
    const app = appWith([queued('a')], [], throwingReviews, [], dueTopics);

    const res = await app.inject({ method: 'GET', url: `/api/cards/due?topicId=${TOPIC}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().dueCount).toBe(1);
    expect(dueTopics).toEqual([TOPIC]);
    await app.close();
  });

  it('E10-S1-T3: topicId sai định dạng trả 400, không xuống tới Postgres', async () => {
    const dueTopics: (string | undefined)[] = [];
    const app = appWith([], [], throwingReviews, [], dueTopics);

    const res = await app.inject({ method: 'GET', url: '/api/cards/due?topicId=khong-phai-uuid' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    expect(dueTopics).toEqual([]);
    await app.close();
  });
});

describe('E8-S1-T3 — GET /api/cards/extra', () => {
  it('trả extraCards gồm phần thẻ và chỉ số trí nhớ, không lộ lịch FSRS thô', async () => {
    const extra = queued('a');
    const app = appWith([], [], throwingReviews, [extra]);

    const res = await app.inject({ method: 'GET', url: '/api/cards/extra' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      extraCards: [{ ...extra.card, dueDate: NOW.toISOString(), memory: NEW_CARD_MEMORY }],
    });
    await app.close();
  });

  it('không có thẻ thoả điều kiện thì trả mảng rỗng', async () => {
    const app = appWith([]);

    const res = await app.inject({ method: 'GET', url: '/api/cards/extra' });

    expect(res.json()).toEqual({ extraCards: [] });
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
        async findExtraCandidates() {
          return [];
        },
      },
      reviews: inMemoryReviews(),
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

describe('E8-S1-T1 — ghi và hoàn tác lượt ôn qua HTTP', () => {
  async function reviewedApp() {
    const reviews = inMemoryReviews([
      { ownerId: SIGNED_IN_USER_ID, cardId: CARD, schedule: createInitialSchedule(NOW) },
    ]);
    const app = appWith([], [], reviews);
    const recorded = await app.inject({
      method: 'POST',
      url: '/api/review-outcomes',
      payload: { cardId: CARD, outcome: 'remembered' },
    });
    return { app, reviews, outcomeId: recorded.json().outcomeId as string };
  }

  it('POST trả outcomeId cùng lịch mới', async () => {
    const { app, reviews, outcomeId } = await reviewedApp();

    expect(outcomeId).toBe(reviews.outcomes[0]?.id);
    await app.close();
  });

  it('DELETE outcome vừa ghi trả 200 kèm lịch đã khôi phục', async () => {
    const { app, outcomeId } = await reviewedApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/review-outcomes/${outcomeId}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().restoredSchedule).toMatchObject({ state: 'new', reps: 0 });
    await app.close();
  });

  it('DELETE outcome không phải mới nhất trả 409 ERR_UNDO_NOT_ALLOWED', async () => {
    const { app, outcomeId } = await reviewedApp();
    await app.inject({
      method: 'POST',
      url: '/api/review-outcomes',
      payload: { cardId: CARD, outcome: 'forgotten' },
    });

    const res = await app.inject({ method: 'DELETE', url: `/api/review-outcomes/${outcomeId}` });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ERR_UNDO_NOT_ALLOWED');
    await app.close();
  });

  it.each([
    ['không tồn tại', UNKNOWN_OUTCOME, 404, 'ERR_OUTCOME_NOT_FOUND'],
    ['sai định dạng UUID', 'khong-phai-uuid', 400, 'ERR_BAD_REQUEST'],
  ])('DELETE id %s trả %i %s', async (_name, id, status, code) => {
    const { app } = await reviewedApp();

    const res = await app.inject({ method: 'DELETE', url: `/api/review-outcomes/${id}` });

    expect(res.statusCode).toBe(status);
    expect(res.json().error.code).toBe(code);
    await app.close();
  });
});
