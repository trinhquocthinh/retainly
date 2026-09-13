import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { applyOutcome } from '../domain/review-scheduler';
import { prismaReviewRepository } from './prisma-review-repository';

const UNKNOWN_CARD_ID = '11111111-1111-1111-1111-111111111111';

async function seedCard(userId: string): Promise<string> {
  const card = await testPrisma.card.create({
    data: {
      userId,
      front: 'Hỏi',
      back: 'Đáp',
      schedule: { create: { state: 'review', dueDate: new Date(), stability: 4, difficulty: 5 } },
    },
  });

  return card.id;
}

beforeEach(resetDatabase);

describe('E1-S4-T9 — ghi kết quả ôn tập trên Postgres thật', () => {
  it('TC-013: cardId không tồn tại thì trả null', async () => {
    expect(await prismaReviewRepository.findScheduleFor(TEST_USER_ID, UNKNOWN_CARD_ID)).toBeNull();
  });

  it('TC-013: thẻ của người khác cũng trả null, không phân biệt với không tồn tại (BR-008)', async () => {
    const cardId = await seedCard(OTHER_USER_ID);

    expect(await prismaReviewRepository.findScheduleFor(TEST_USER_ID, cardId)).toBeNull();
  });

  it('ghi outcome thì cập nhật lịch và chèn bản ghi cùng lúc', async () => {
    const cardId = await seedCard(TEST_USER_ID);
    const current = await prismaReviewRepository.findScheduleFor(TEST_USER_ID, cardId);
    const reviewedAt = new Date();

    await prismaReviewRepository.save({
      cardId,
      outcome: 'remembered',
      reviewedAt,
      schedule: applyOutcome(current!, 'remembered', reviewedAt),
    });

    const schedule = await testPrisma.reviewSchedule.findUniqueOrThrow({ where: { cardId } });
    const outcomes = await testPrisma.reviewOutcome.findMany({ where: { cardId } });

    expect(schedule.reps).toBe(1);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].outcome).toBe('remembered');
  });
});
