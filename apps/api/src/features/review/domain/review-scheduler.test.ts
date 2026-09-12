import { describe, it, expect } from 'vitest';

import { applyOutcome, createInitialSchedule, type Schedule } from './review-scheduler';

const NOW = new Date('2026-06-15T09:00:00Z');
const DAY = 86_400_000;

function reviewed(intervalDays: number, stability: number): Schedule {
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

describe('E1-S1-T2 — lịch ôn tập FSRS', () => {
  it('TC-004: thẻ mới ở trạng thái "new" và đến hạn ngay hôm nay', () => {
    const schedule = createInitialSchedule(NOW);
    expect(schedule.state).toBe('new');
    expect(schedule.dueDate).toEqual(NOW);
    expect(schedule.intervalDays).toBe(0);
    expect(schedule.reps).toBe(0);
  });

  it('TC-011: thẻ interval 1 ngày, Nhớ thì khoảng cách dài ra (BR-005)', () => {
    const next = applyOutcome(reviewed(1, 1), 'remembered', NOW);
    expect(next.intervalDays).toBeGreaterThan(1);
  });

  it('TC-012: thẻ interval 4 ngày, Quên thì khoảng cách ngắn lại (BR-004)', () => {
    const next = applyOutcome(reviewed(4, 4), 'forgotten', NOW);
    expect(next.intervalDays).toBeLessThan(4);
  });

  it('Quên làm tăng lapses, giảm stability và ghi lại mốc ôn', () => {
    const current = reviewed(4, 4);
    const next = applyOutcome(current, 'forgotten', NOW);
    expect(next.lapses).toBe(current.lapses + 1);
    expect(next.stability).toBeLessThan(current.stability);
    expect(next.lastReviewedAt).toEqual(NOW);
  });

  it('ghim cấu hình: thẻ mới + Nhớ ra đúng 3 ngày, chuyển sang "review"', () => {
    const next = applyOutcome(createInitialSchedule(NOW), 'remembered', NOW);
    expect(next.intervalDays).toBe(3);
    expect(next.state).toBe('review');
  });
});
