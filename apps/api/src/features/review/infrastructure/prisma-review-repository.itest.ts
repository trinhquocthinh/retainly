import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { recordOutcome } from '../application/record-outcome';
import type { ReviewRepository } from '../application/review-repository';
import { undoOutcome } from '../application/undo-outcome';
import { prismaReviewRepository } from './prisma-review-repository';

const UNKNOWN_CARD_ID = '11111111-1111-1111-1111-111111111111';
const deps = { reviews: prismaReviewRepository, now: () => new Date() };

async function seedCard(userId: string): Promise<string> {
  const card = await testPrisma.card.create({
    data: {
      userId,
      front: 'Hỏi',
      back: 'Đáp',
      schedule: {
        create: {
          state: 'review',
          dueDate: new Date('2026-09-20T01:02:03.456Z'),
          intervalDays: 3,
          stability: 4,
          difficulty: 5,
          elapsedDays: 3,
          scheduledDays: 3,
          reps: 2,
          lapses: 1,
          lastReviewedAt: new Date('2026-09-17T01:02:03.456Z'),
        },
      },
    },
  });

  return card.id;
}

/** Đọc mọi cột lịch trừ updated_at — cột do Prisma tự đổi mỗi lần ghi. */
function scheduleRow(cardId: string) {
  return testPrisma.reviewSchedule.findUniqueOrThrow({
    where: { cardId },
    omit: { updatedAt: true },
  });
}

beforeEach(resetDatabase);

describe('E1-S4-T9 — ghi kết quả ôn tập trên Postgres thật', () => {
  it('TC-013: cardId không tồn tại thì trả null', async () => {
    await expect(
      prismaReviewRepository.inTransaction((store) =>
        store.lockSchedule(TEST_USER_ID, UNKNOWN_CARD_ID),
      ),
    ).resolves.toBeNull();
  });

  it('TC-013: thẻ của người khác cũng trả null, không phân biệt với không tồn tại (BR-008)', async () => {
    const cardId = await seedCard(OTHER_USER_ID);

    await expect(
      prismaReviewRepository.inTransaction((store) => store.lockSchedule(TEST_USER_ID, cardId)),
    ).resolves.toBeNull();
  });

  it('ghi outcome thì cập nhật lịch và chèn bản ghi cùng lúc', async () => {
    const cardId = await seedCard(TEST_USER_ID);

    const { outcomeId } = await recordOutcome(deps, {
      userId: TEST_USER_ID,
      cardId,
      outcome: 'remembered',
    });

    const schedule = await testPrisma.reviewSchedule.findUniqueOrThrow({ where: { cardId } });
    const outcomes = await testPrisma.reviewOutcome.findMany({ where: { cardId } });

    expect(schedule.reps).toBe(3);
    expect(outcomes.map((row) => [row.id, row.outcome])).toEqual([[outcomeId, 'remembered']]);
  });
});

describe('E8-S1-T1 — hoàn tác và khoá dòng lịch trên Postgres thật', () => {
  it('hoàn tác khôi phục đúng từng cột lịch và xoá hẳn outcome (BR-024)', async () => {
    const cardId = await seedCard(TEST_USER_ID);
    const before = await scheduleRow(cardId);
    const { outcomeId } = await recordOutcome(deps, {
      userId: TEST_USER_ID,
      cardId,
      outcome: 'forgotten',
    });

    await undoOutcome(deps, { userId: TEST_USER_ID, outcomeId });

    expect(await scheduleRow(cardId)).toEqual(before);
    expect(await testPrisma.reviewOutcome.count({ where: { cardId } })).toBe(0);
  });

  it('outcome ghi trước E8 (previous_schedule null) thì trả ERR_UNDO_NOT_ALLOWED', async () => {
    const cardId = await seedCard(TEST_USER_ID);
    const legacy = await testPrisma.reviewOutcome.create({
      data: { cardId, outcome: 'remembered', reviewedAt: new Date() },
    });

    await expect(undoOutcome(deps, { userId: TEST_USER_ID, outcomeId: legacy.id })).rejects.toThrow(
      'ERR_UNDO_NOT_ALLOWED',
    );
  });

  it('hai lượt ghi song song trên cùng thẻ xếp hàng, không lượt nào bị đè', async () => {
    const cardId = await seedCard(TEST_USER_ID);
    const input = { userId: TEST_USER_ID, cardId, outcome: 'remembered' } as const;
    // Giữ transaction lại một nhịp sau khi đọc lịch, để lượt kia chắc chắn chen
    // vào giữa. Thiếu nhịp này, hai lượt thường tự chạy nối đuôi và test xanh
    // cả khi bỏ khoá — đã thử bỏ FOR UPDATE để xác nhận test đỏ.
    const slowReviews: ReviewRepository = {
      inTransaction: (work) =>
        prismaReviewRepository.inTransaction((store) =>
          work({
            ...store,
            async lockSchedule(userId, lockedCardId) {
              const schedule = await store.lockSchedule(userId, lockedCardId);
              await new Promise((resolve) => setTimeout(resolve, 200));
              return schedule;
            },
          }),
        ),
    };
    const slowDeps = { ...deps, reviews: slowReviews };

    await Promise.all([recordOutcome(slowDeps, input), recordOutcome(slowDeps, input)]);

    const schedule = await testPrisma.reviewSchedule.findUniqueOrThrow({ where: { cardId } });
    const outcomes = await testPrisma.reviewOutcome.findMany({ where: { cardId } });
    const previousReps = outcomes.map((row) => (row.previousSchedule as { reps: number }).reps);

    // Không khoá thì cả hai cùng tính từ reps = 2: lịch cuối chỉ có reps = 3 và
    // hai ảnh chụp đều là reps = 2. Hai lượt có thể trùng mili giây nên sắp lại.
    expect(schedule.reps).toBe(4);
    expect(previousReps.sort()).toEqual([2, 3]);
  });
});
