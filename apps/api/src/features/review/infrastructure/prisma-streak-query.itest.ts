import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';
import { prismaStreakQuery } from './prisma-streak-query';

async function seedOutcome(userId: string, reviewedAt: Date): Promise<void> {
  await testPrisma.card.create({
    data: {
      userId,
      front: 'Hỏi',
      back: 'Đáp',
      outcomes: { create: { outcome: 'remembered', reviewedAt } },
    },
  });
}

beforeEach(resetDatabase);

describe('E5-S1-T1 — truy vấn ngày ôn tập trên PostgreSQL', () => {
  it('gom trùng theo ngày Việt Nam và sắp xếp mới nhất trước', async () => {
    await seedOutcome(TEST_USER_ID, new Date('2026-09-18T16:59:59Z'));
    await seedOutcome(TEST_USER_ID, new Date('2026-09-18T17:00:00Z'));
    await seedOutcome(TEST_USER_ID, new Date('2026-09-19T01:00:00Z'));

    await expect(prismaStreakQuery.findReviewDaysBy(TEST_USER_ID)).resolves.toEqual([
      '2026-09-19',
      '2026-09-18',
    ]);
  });

  it('BR-008: không trả ngày ôn tập của người dùng khác', async () => {
    await seedOutcome(TEST_USER_ID, new Date('2026-09-19T03:00:00Z'));
    await seedOutcome(OTHER_USER_ID, new Date('2026-09-18T03:00:00Z'));

    await expect(prismaStreakQuery.findReviewDaysBy(TEST_USER_ID)).resolves.toEqual(['2026-09-19']);
  });
});
