import { describe, expect, it } from 'vitest';

import { retrievability, type Schedule } from '../../review/domain/review-scheduler';
import { MASTERED_STABILITY_DAYS, summarizeLibrary } from './library-stats';

// 16:00 ngày 15/06 giờ Việt Nam: hôm nay kéo dài từ 14/06 17:00Z tới 15/06 16:59:59.999Z.
const NOW = new Date('2026-06-15T09:00:00Z');

const NEW_CARD: Schedule = {
  state: 'new',
  dueDate: new Date('2026-06-10T00:00:00Z'),
  intervalDays: 0,
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  lastReviewedAt: null,
};

function reviewed(overrides: Partial<Schedule>): Schedule {
  return {
    ...NEW_CARD,
    state: 'review',
    dueDate: new Date('2026-06-20T00:00:00Z'),
    intervalDays: 5,
    stability: 5,
    difficulty: 5,
    scheduledDays: 5,
    reps: 1,
    lastReviewedAt: new Date('2026-06-12T00:00:00Z'),
    ...overrides,
  };
}

describe('E9-S1-T3 — summarizeLibrary', () => {
  it('thư viện trống: đếm 0, trung bình null', () => {
    expect(summarizeLibrary([], NOW)).toEqual({
      totalCards: 0,
      dueToday: 0,
      overdue: 0,
      reviewedCards: 0,
      averageRetrievability: null,
      averageStability: null,
      masteredCards: 0,
    });
  });

  it('cần ôn tính tới hết ngày giờ VN, kể cả thẻ mới; quá hạn chỉ tính thẻ đã học hạn trước hôm nay', () => {
    const stats = summarizeLibrary(
      [
        NEW_CARD,
        reviewed({ dueDate: new Date('2026-06-14T16:59:59.999Z') }), // 23:59 hôm qua
        reviewed({ dueDate: new Date('2026-06-14T17:00:00.000Z') }), // 00:00 hôm nay
        reviewed({ dueDate: new Date('2026-06-15T16:59:59.999Z') }), // 23:59 hôm nay
        reviewed({ dueDate: new Date('2026-06-15T17:00:00.000Z') }), // 00:00 ngày mai
      ],
      NOW,
    );

    expect(stats).toMatchObject({ totalCards: 5, dueToday: 4, overdue: 1, reviewedCards: 4 });
  });

  it('độ nhớ và độ ổn định trung bình bỏ qua thẻ chưa ôn', () => {
    const justReviewed = reviewed({ stability: 2, lastReviewedAt: NOW });
    const older = reviewed({ stability: 10 });

    const stats = summarizeLibrary([NEW_CARD, justReviewed, older], NOW);

    expect(stats.averageStability).toBe(6);
    // Vừa ôn xong thì R = 1; thẻ mới (R = 0) không kéo trung bình xuống.
    expect(stats.averageRetrievability).toBeCloseTo((1 + retrievability(older, NOW)) / 2, 10);
  });

  it('đã thuộc khi độ ổn định vượt ngưỡng, bằng ngưỡng thì chưa', () => {
    const stats = summarizeLibrary(
      [
        reviewed({ stability: MASTERED_STABILITY_DAYS }),
        reviewed({ stability: MASTERED_STABILITY_DAYS + 0.1 }),
        reviewed({ stability: 120 }),
      ],
      NOW,
    );

    expect(stats.masteredCards).toBe(2);
  });
});
