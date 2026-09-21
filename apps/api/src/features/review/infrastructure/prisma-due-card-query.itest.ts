import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { endOfToday } from '../domain/due-window';
import { prismaDueCardQuery } from './prisma-due-card-query';

const DAY = 86_400_000;

async function seedCard(userId: string, front: string, dueDate: Date): Promise<void> {
  await testPrisma.card.create({
    data: { userId, front, back: 'Đáp', schedule: { create: { state: 'review', dueDate } } },
  });
}

beforeEach(resetDatabase);

describe('E1-S4-T9 — danh sách đến hạn trên Postgres thật', () => {
  it('TC-008: có 5 thẻ đến hạn thì trả đúng 5, thẻ của ngày mai không lọt vào', async () => {
    const now = new Date();

    for (let i = 0; i < 5; i += 1) {
      await seedCard(TEST_USER_ID, `Thẻ ${i}`, new Date(now.getTime() - i * DAY));
    }
    await seedCard(TEST_USER_ID, 'Thẻ ngày mai', new Date(now.getTime() + 2 * DAY));

    const due = await prismaDueCardQuery.findDueBy(TEST_USER_ID, endOfToday(now));

    expect(due).toHaveLength(5);
    expect(due.map((card) => card.front)).not.toContain('Thẻ ngày mai');
  });

  it('BR-008: không bao giờ trả thẻ của người khác', async () => {
    const now = new Date();
    await seedCard(TEST_USER_ID, 'Thẻ của tôi', now);
    await seedCard(OTHER_USER_ID, 'Thẻ của người khác', now);

    const due = await prismaDueCardQuery.findDueBy(TEST_USER_ID, endOfToday(now));

    expect(due.map((card) => card.front)).toEqual(['Thẻ của tôi']);
  });

  it('sắp theo dueDate tăng dần — thẻ quá hạn lâu nhất lên trước', async () => {
    const now = new Date();
    await seedCard(TEST_USER_ID, 'Mới quá hạn', new Date(now.getTime() - DAY));
    await seedCard(TEST_USER_ID, 'Quá hạn lâu', new Date(now.getTime() - 5 * DAY));

    const due = await prismaDueCardQuery.findDueBy(TEST_USER_ID, endOfToday(now));

    expect(due.map((card) => card.front)).toEqual(['Quá hạn lâu', 'Mới quá hạn']);
  });
});

describe('E7-S1-T2 — hàng đợi ôn mang theo ghi chú', () => {
  it('trả note của thẻ, thẻ không có ghi chú trả null', async () => {
    const now = new Date();
    await testPrisma.card.create({
      data: {
        userId: TEST_USER_ID,
        front: 'Có ghi chú',
        back: 'Đáp',
        note: 'Mẹo nhớ',
        schedule: { create: { state: 'review', dueDate: new Date(now.getTime() - DAY) } },
      },
    });
    await seedCard(TEST_USER_ID, 'Không ghi chú', now);

    const due = await prismaDueCardQuery.findDueBy(TEST_USER_ID, endOfToday(now));

    expect(due.map(({ front, note }) => ({ front, note }))).toEqual([
      { front: 'Có ghi chú', note: 'Mẹo nhớ' },
      { front: 'Không ghi chú', note: null },
    ]);
  });
});
