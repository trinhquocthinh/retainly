import { describe, it, expect } from 'vitest';

import { EXTRA_REVIEW_LIMIT, pickExtraReview } from './extra-review';
import type { Schedule } from './review-scheduler';

const NOW = new Date('2026-09-23T05:00:00Z');
const DAY = 86_400_000;

/** Thẻ đã ôn `daysAgo` ngày trước với độ bền `stability`, hạn sau `dueInDays` ngày. */
function candidate(id: string, stability: number, daysAgo: number, dueInDays = 3) {
  const schedule: Schedule = {
    state: 'review',
    dueDate: new Date(NOW.getTime() + dueInDays * DAY),
    intervalDays: daysAgo + dueInDays,
    stability,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: daysAgo + dueInDays,
    reps: 2,
    lapses: 0,
    lastReviewedAt: new Date(NOW.getTime() - daysAgo * DAY),
  };
  return { id, schedule };
}

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('E8-S1-T3 — chọn thẻ Ôn thêm (BR-026)', () => {
  it('xếp R tăng dần: stability thấp hoặc để lâu hơn thì sắp quên hơn', () => {
    const picked = pickExtraReview(
      [candidate('ben', 30, 2), candidate('yeu', 3, 2), candidate('lau', 30, 40)],
      NOW,
    );

    expect(ids(picked)).toEqual(['lau', 'yeu', 'ben']);
  });

  it(`lấy tối đa ${EXTRA_REVIEW_LIMIT} thẻ có R thấp nhất`, () => {
    const candidates = [10, 1, 9, 2, 8, 3, 7].map((stability) =>
      candidate(`s${stability}`, stability, 2),
    );

    expect(ids(pickExtraReview(candidates, NOW))).toEqual(['s1', 's2', 's3', 's7', 's8']);
  });

  it('R bằng nhau thì thẻ có hạn sớm hơn lên trước, hoà nữa thì giữ thứ tự đầu vào', () => {
    const picked = pickExtraReview(
      [candidate('muon', 5, 2, 6), candidate('som-1', 5, 2, 2), candidate('som-2', 5, 2, 2)],
      NOW,
    );

    expect(ids(picked)).toEqual(['som-1', 'som-2', 'muon']);
  });

  it('không có ứng viên thì trả mảng rỗng', () => {
    expect(pickExtraReview([], NOW)).toEqual([]);
  });
});
