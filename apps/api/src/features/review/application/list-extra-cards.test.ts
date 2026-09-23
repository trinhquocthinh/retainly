import { describe, it, expect } from 'vitest';

import type { DueCardQuery, ScheduledCard } from './list-due-cards';
import { listExtraCards } from './list-extra-cards';
import { describeMemory } from '../domain/card-memory';

const NOW = new Date('2026-09-12T13:49:00Z');
const USER = '00000000-0000-0000-0000-000000000001';
const DAY = 86_400_000;

function candidate(id: string, stability: number): ScheduledCard {
  const dueDate = new Date(NOW.getTime() + 3 * DAY);
  return {
    card: { id, front: `Hỏi ${id}`, back: `Đáp ${id}`, note: null, dueDate },
    schedule: {
      state: 'review',
      dueDate,
      intervalDays: 5,
      stability,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 5,
      reps: 2,
      lapses: 0,
      lastReviewedAt: new Date(NOW.getTime() - 2 * DAY),
    },
  };
}

function fakeQuery(rows: ScheduledCard[]) {
  const calls: { userId: string; window: { dueAfter: Date; notReviewedSince: Date } }[] = [];
  const query: DueCardQuery = {
    async findDueBy() {
      throw new Error('Ôn thêm không được đọc hàng đợi đến hạn');
    },
    async findExtraCandidates(userId, window) {
      calls.push({ userId, window });
      return rows;
    },
  };
  return { query, calls };
}

describe('E8-S1-T3 — danh sách Ôn thêm', () => {
  it('lọc theo userId, hạn sau cuối ngày và chưa ôn từ đầu ngày giờ Việt Nam', async () => {
    const { query, calls } = fakeQuery([]);

    await listExtraCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(calls).toEqual([
      {
        userId: USER,
        window: {
          dueAfter: new Date('2026-09-12T16:59:59.999Z'),
          notReviewedSince: new Date('2026-09-11T17:00:00.000Z'),
        },
      },
    ]);
  });

  it('trả tối đa 5 thẻ R thấp nhất, kèm chỉ số trí nhớ thay cho lịch FSRS thô', async () => {
    const { query } = fakeQuery([6, 1, 5, 2, 4, 3].map((s) => candidate(`s${s}`, s)));

    const result = await listExtraCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(result.extraCards.map((card) => card.id)).toEqual(['s1', 's2', 's3', 's4', 's5']);
    const { card, schedule } = candidate('s1', 1);
    expect(result.extraCards[0]).toEqual({ ...card, memory: describeMemory(schedule, NOW) });
  });

  it('không có thẻ thoả điều kiện thì trả danh sách rỗng', async () => {
    const { query } = fakeQuery([]);

    const result = await listExtraCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(result).toEqual({ extraCards: [] });
  });
});
