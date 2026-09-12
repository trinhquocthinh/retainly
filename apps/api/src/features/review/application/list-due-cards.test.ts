import { describe, it, expect } from 'vitest';

import { listDueCards, type DueCard, type DueCardQuery } from './list-due-cards';

const NOW = new Date('2026-09-12T13:49:00Z');
const USER = '00000000-0000-0000-0000-000000000001';

function fakeQuery(rows: DueCard[]) {
  const calls: { userId: string; cutoff: Date }[] = [];
  const query: DueCardQuery = {
    async findDueBy(userId, cutoff) {
      calls.push({ userId, cutoff });
      return rows;
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

  it('dueCount khớp số phần tử trả về', async () => {
    const rows: DueCard[] = [
      { id: 'a', front: 'Hỏi A', back: 'Đáp A', dueDate: NOW },
      { id: 'b', front: 'Hỏi B', back: 'Đáp B', dueDate: NOW },
    ];
    const { query } = fakeQuery(rows);

    const result = await listDueCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(result.dueCount).toBe(2);
    expect(result.dueCards).toEqual(rows);
  });

  it('lọc theo đúng userId và mốc cuối ngày (BR-008)', async () => {
    const { query, calls } = fakeQuery([]);

    await listDueCards({ schedules: query, now: () => NOW }, { userId: USER });

    expect(calls).toEqual([{ userId: USER, cutoff: new Date('2026-09-12T16:59:59.999Z') }]);
  });
});
