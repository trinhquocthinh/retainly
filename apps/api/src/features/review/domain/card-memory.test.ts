import { describe, it, expect } from 'vitest';

import { describeMemory } from './card-memory';
import { applyOutcome, createInitialSchedule, retrievability } from './review-scheduler';

const NOW = new Date('2026-09-23T05:00:00Z');
const DAY = 86_400_000;

describe('E8-S1-T5 — chỉ số trí nhớ trong hàng đợi ôn', () => {
  it('thẻ mới: chưa có trí nhớ, dự báo là khoảng cách của lượt ôn đầu tiên', () => {
    const memory = describeMemory(createInitialSchedule(NOW), NOW);

    expect(memory).toEqual({
      stability: 0,
      difficulty: 0,
      retrievability: 0,
      lastReviewedAt: null,
      forecastDays: { remembered: 3, forgotten: 1 },
    });
  });

  it('thẻ đã ôn: S, D lấy từ lịch, R và dự báo tính tại thời điểm nạp', () => {
    const reviewedAt = new Date(NOW.getTime() - 5 * DAY);
    const schedule = applyOutcome(createInitialSchedule(reviewedAt), 'remembered', reviewedAt);

    const memory = describeMemory(schedule, NOW);

    expect(memory.stability).toBe(schedule.stability);
    expect(memory.difficulty).toBe(schedule.difficulty);
    expect(memory.retrievability).toBe(retrievability(schedule, NOW));
    expect(memory.lastReviewedAt).toEqual(reviewedAt);
    expect(memory.forecastDays).toEqual({
      remembered: applyOutcome(schedule, 'remembered', NOW).intervalDays,
      forgotten: applyOutcome(schedule, 'forgotten', NOW).intervalDays,
    });
    expect(memory.forecastDays.remembered).toBeGreaterThan(memory.forecastDays.forgotten);
  });
});
