import { describe, it, expect } from 'vitest';

import { recordOutcome, type ReviewRepository } from './record-outcome';
import type { Schedule } from '../domain/review-scheduler';

const NOW = new Date('2026-09-12T09:00:00Z');
const USER = '00000000-0000-0000-0000-000000000001';
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

function fakeRepo(schedule: Schedule | null) {
  const saved: unknown[] = [];
  const repo: ReviewRepository = {
    async findScheduleFor() {
      return schedule;
    },
    async save(input) {
      saved.push(input);
    },
  };
  return { repo, saved };
}

describe('E1-S2-T5 — ghi nhận kết quả ôn tập', () => {
  it('TC-011: Nhớ thì interval dài ra và lịch mới được lưu (BR-005)', async () => {
    const { repo, saved } = fakeRepo(scheduleWith(1, 1));

    const result = await recordOutcome(
      { reviews: repo, now: () => NOW },
      { userId: USER, cardId: CARD, outcome: 'remembered' },
    );

    expect(result.updatedSchedule.intervalDays).toBeGreaterThan(1);
    expect(saved).toHaveLength(1);
  });

  it('TC-012: Quên thì interval ngắn lại và lapses tăng (BR-004)', async () => {
    const { repo } = fakeRepo(scheduleWith(4, 4));

    const result = await recordOutcome(
      { reviews: repo, now: () => NOW },
      { userId: USER, cardId: CARD, outcome: 'forgotten' },
    );

    expect(result.updatedSchedule.intervalDays).toBeLessThan(4);
    expect(result.updatedSchedule.lapses).toBe(1);
  });

  it('ghi outcome kèm mốc thời gian — đây là cách BR-001 được ghi nhận', async () => {
    const { repo, saved } = fakeRepo(scheduleWith(1, 1));

    await recordOutcome(
      { reviews: repo, now: () => NOW },
      { userId: USER, cardId: CARD, outcome: 'remembered' },
    );

    expect(saved[0]).toMatchObject({ cardId: CARD, outcome: 'remembered', reviewedAt: NOW });
  });

  it('TC-013: không tìm thấy thẻ thì trả ERR_CARD_NOT_FOUND và không ghi gì', async () => {
    const { repo, saved } = fakeRepo(null);

    await expect(
      recordOutcome(
        { reviews: repo, now: () => NOW },
        { userId: USER, cardId: CARD, outcome: 'remembered' },
      ),
    ).rejects.toThrow('ERR_CARD_NOT_FOUND');

    expect(saved).toHaveLength(0);
  });
});
