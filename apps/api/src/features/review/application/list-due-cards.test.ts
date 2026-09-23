import { describe, it, expect } from 'vitest';

import { describeMemory } from '../domain/card-memory';
import { createInitialSchedule } from '../domain/review-scheduler';
import { listDueCards, type DueCardQuery, type ScheduledCard } from './list-due-cards';

const NOW = new Date('2026-09-12T13:49:00Z');
const USER = '00000000-0000-0000-0000-000000000001';

function row(id: string): ScheduledCard {
  return {
    card: { id, front: `Hỏi ${id}`, back: `Đáp ${id}`, note: null, dueDate: NOW },
    schedule: createInitialSchedule(NOW),
  };
}

function fakeQuery(rows: ScheduledCard[]) {
  const calls: { userId: string; cutoff: Date }[] = [];
  const query: DueCardQuery = {
    async findDueBy(userId, cutoff) {
      calls.push({ userId, cutoff });
      return rows;
    },
    async findExtraCandidates() {
      throw new Error('hàng đợi đến hạn không được đọc ứng viên Ôn thêm');
    },
  };
  return { query, calls };
}

describe('E1-S2-T4 — danh sách thẻ đến hạn', () => {
  it('TC-009: không có thẻ đến hạn thì trả dueCount=0 và mảng rỗng', async () => {
    const { query } = fakeQuery([]);

    const result = await listDueCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(result).toEqual({ dueCards: [], dueCount: 0 });
  });

  it('dueCount khớp số phần tử trả về, giữ thứ tự của tầng dưới', async () => {
    const { query } = fakeQuery([row('a'), row('b')]);

    const result = await listDueCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(result.dueCount).toBe(2);
    expect(result.dueCards.map((card) => card.id)).toEqual(['a', 'b']);
  });

  it('lọc theo đúng userId và mốc cuối ngày (BR-008)', async () => {
    const { query, calls } = fakeQuery([]);

    await listDueCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(calls).toEqual([{ userId: USER, cutoff: new Date('2026-09-12T16:59:59.999Z') }]);
  });
});

describe('E8-S1-T5 — hàng đợi kèm chỉ số trí nhớ', () => {
  it('mỗi thẻ có memory tính tại lúc nạp, không lộ cột lịch thô', async () => {
    const { query } = fakeQuery([row('a')]);

    const [card] = (await listDueCards({ schedules: query, now: () => NOW }, { userId: USER }))
      .dueCards;

    expect(card).toEqual({
      ...row('a').card,
      memory: describeMemory(createInitialSchedule(NOW), NOW),
    });
    expect(card).not.toHaveProperty('schedule');
  });
});
