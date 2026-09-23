import { describe, it, expect } from 'vitest';

import { inMemoryReviews } from '../../../shared/test/in-memory-review';
import { recordOutcome } from './record-outcome';
import type { Schedule } from '../domain/review-scheduler';

const NOW = new Date('2026-09-12T09:00:00Z');
const USER = '00000000-0000-0000-0000-000000000001';
const OTHER_USER = '00000000-0000-0000-0000-000000000002';
const CARD = '11111111-1111-1111-1111-111111111111';
const DAY = 86_400_000;

function scheduleWith(intervalDays: number, stability: number): Schedule {
  return {
    state: 'review',
    dueDate: NOW,
    intervalDays,
    stability,
    difficulty: 5,
    elapsedDays: intervalDays,
    scheduledDays: intervalDays,
    reps: 3,
    lapses: 0,
    lastReviewedAt: new Date(NOW.getTime() - intervalDays * DAY),
  };
}

function reviewsOwning(schedule: Schedule, ownerId = USER) {
  return inMemoryReviews([{ ownerId, cardId: CARD, schedule }]);
}

describe('E1-S2-T5 — ghi nhận kết quả ôn tập', () => {
  it('TC-011: Nhớ thì interval dài ra và lịch mới được lưu (BR-005)', async () => {
    const reviews = reviewsOwning(scheduleWith(1, 1));

    const result = await recordOutcome(
      { reviews, now: () => NOW },
      { userId: USER, cardId: CARD, outcome: 'remembered' },
    );

    expect(result.updatedSchedule.intervalDays).toBeGreaterThan(1);
    expect(reviews.schedules.get(CARD)?.schedule).toEqual(result.updatedSchedule);
  });

  it('TC-012: Quên thì interval ngắn lại và lapses tăng (BR-004)', async () => {
    const reviews = reviewsOwning(scheduleWith(4, 4));

    const result = await recordOutcome(
      { reviews, now: () => NOW },
      { userId: USER, cardId: CARD, outcome: 'forgotten' },
    );

    expect(result.updatedSchedule.intervalDays).toBeLessThan(4);
    expect(result.updatedSchedule.lapses).toBe(1);
  });

  it('ghi outcome kèm mốc thời gian — đây là cách BR-001 được ghi nhận', async () => {
    const reviews = reviewsOwning(scheduleWith(1, 1));

    await recordOutcome(
      { reviews, now: () => NOW },
      { userId: USER, cardId: CARD, outcome: 'remembered' },
    );

    expect(reviews.outcomes[0]).toMatchObject({
      cardId: CARD,
      outcome: 'remembered',
      reviewedAt: NOW,
    });
  });

  it.each([
    ['không tồn tại', inMemoryReviews()],
    ['của người khác', reviewsOwning(scheduleWith(1, 1), OTHER_USER)],
  ])('TC-013: thẻ %s thì trả ERR_CARD_NOT_FOUND và không ghi gì', async (_name, reviews) => {
    await expect(
      recordOutcome(
        { reviews, now: () => NOW },
        { userId: USER, cardId: CARD, outcome: 'remembered' },
      ),
    ).rejects.toThrow('ERR_CARD_NOT_FOUND');

    expect(reviews.outcomes).toHaveLength(0);
  });
});

describe('E8-S1-T1 — outcome mang theo thứ cần để hoàn tác', () => {
  it('trả outcomeId và lưu ảnh chụp lịch ngay trước lượt ôn (BR-024)', async () => {
    const before = scheduleWith(4, 4);
    const reviews = reviewsOwning(before);

    const result = await recordOutcome(
      { reviews, now: () => NOW },
      { userId: USER, cardId: CARD, outcome: 'forgotten' },
    );

    expect(result.outcomeId).toBe(reviews.outcomes[0]?.id);
    expect(reviews.outcomes[0]?.previousSchedule).toEqual(before);
  });
});
