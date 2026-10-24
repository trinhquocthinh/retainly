import { beforeEach, describe, expect, it } from 'vitest';
import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import {
  beginPractice,
  getPractice,
  ratePractice,
  undoPractice,
} from '../application/practice-session';
import { createInitialSchedule } from '../domain/review-scheduler';
import { undoOutcome } from '../application/undo-outcome';
import { prismaReviewRepository } from './prisma-review-repository';
import { prismaPracticeRepository } from './prisma-practice-repository';

const NOW = new Date('2026-10-24T03:00:00Z');
const deps = { practices: prismaPracticeRepository, now: () => NOW, random: () => 0.5 };

async function seed(count: number, learned = false, userId = TEST_USER_ID) {
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      testPrisma.card.create({
        data: {
          userId,
          front: `Hỏi ${i}`,
          back: 'Đáp',
          schedule: {
            create: {
              ...createInitialSchedule(NOW),
              ...(learned
                ? {
                    state: 'review',
                    reps: 1,
                    stability: 3,
                    difficulty: 5,
                    dueDate: new Date('2026-10-27T03:00:00Z'),
                    lastReviewedAt: new Date('2026-10-23T03:00:00Z'),
                  }
                : {}),
            },
          },
        },
      }),
    ),
  );
}

beforeEach(resetDatabase);

describe('bài học lưu trong PostgreSQL', () => {
  it('ba request bắt đầu đồng thời chỉ tạo một bài, giữ nguyên thứ tự khi tải lại', async () => {
    await seed(20);
    const results = await Promise.all(
      [15, 15, 15].map(() => beginPractice(deps, { userId: TEST_USER_ID, size: 15 })),
    );
    expect(new Set(results.map((s) => s?.id)).size).toBe(1);
    expect(await testPrisma.practiceSession.count()).toBe(1);
    const first = results[0]!;
    const resumed = await getPractice(deps, { userId: TEST_USER_ID, sessionId: first.id });
    expect(resumed.items.map((i) => i.id)).toEqual(first.items.map((i) => i.id));
    expect(resumed.items).toHaveLength(15);
  });

  it('trộn thẻ cũ chưa đến hạn với thẻ chưa học; loại thẻ đã ôn hôm nay và thẻ người khác', async () => {
    const old = await seed(15, true);
    await seed(50);
    const today = await seed(3);
    await testPrisma.reviewOutcome.createMany({
      data: today.map((c) => ({ cardId: c.id, outcome: 'remembered', reviewedAt: NOW })),
    });
    const other = await seed(5, false, OTHER_USER_ID);
    const result = (await beginPractice(deps, { userId: TEST_USER_ID, size: 15 }))!;
    const ids = result.items.map((i) => i.card!.id);
    expect(ids.filter((id) => old.some((c) => c.id === id))).toHaveLength(10);
    expect(ids.some((id) => [...today, ...other].some((c) => c.id === id))).toBe(false);
    expect(ids).toHaveLength(15);
  });

  it('hai request chấm cùng câu chỉ ghi một outcome và tăng reps một lần', async () => {
    await seed(2);
    const result = (await beginPractice(deps, { userId: TEST_USER_ID, size: 15 }))!;
    const item = result.items[0];
    const input = {
      userId: TEST_USER_ID,
      sessionId: result.id,
      itemId: item.id,
      outcome: 'remembered' as const,
    };
    await Promise.all([ratePractice(deps, input), ratePractice(deps, input)]);
    expect(await testPrisma.reviewOutcome.count()).toBe(1);
    expect(
      (await testPrisma.reviewSchedule.findUniqueOrThrow({ where: { cardId: item.card!.id } }))
        .reps,
    ).toBe(1);
  });

  it('lỗi liên kết câu trả lời rollback cả outcome lẫn lịch FSRS', async () => {
    await seed(2);
    const result = (await beginPractice(deps, { userId: TEST_USER_ID, size: 15 }))!;
    const broken = {
      ...deps,
      practices: {
        ...prismaPracticeRepository,
        inTransaction: ((userId, work) =>
          prismaPracticeRepository.inTransaction(userId, (store) =>
            work({
              ...store,
              linkAnswer: async () => {
                throw new Error('simulated write failure');
              },
            }),
          )) as typeof prismaPracticeRepository.inTransaction,
      },
    };
    await expect(
      ratePractice(broken, {
        userId: TEST_USER_ID,
        sessionId: result.id,
        itemId: result.items[0].id,
        outcome: 'remembered',
      }),
    ).rejects.toThrow('simulated write failure');
    expect(await testPrisma.reviewOutcome.count()).toBe(0);
    expect(
      (
        await testPrisma.reviewSchedule.findUniqueOrThrow({
          where: { cardId: result.items[0].card!.id },
        })
      ).reps,
    ).toBe(0);
  });

  it('hoàn thành rồi Undo cập nhật lại thành tích trong ngày và có thể retry an toàn', async () => {
    await seed(2);
    let result = (await beginPractice(deps, { userId: TEST_USER_ID, size: 15 }))!;
    for (const item of result.items)
      result = await ratePractice(deps, {
        userId: TEST_USER_ID,
        sessionId: result.id,
        itemId: item.id,
        outcome: 'remembered',
      });
    expect((await prismaPracticeRepository.overview(TEST_USER_ID, NOW)).completedToday).toBe(1);
    const last = result.items[1];
    const input = {
      userId: TEST_USER_ID,
      sessionId: result.id,
      itemId: last.id,
      outcomeId: last.answer!.id!,
    };
    await undoPractice(deps, input);
    await undoPractice(deps, input);
    expect((await prismaPracticeRepository.overview(TEST_USER_ID, NOW)).completedToday).toBe(0);
    expect(await testPrisma.reviewOutcome.count()).toBe(1);
  });

  it('API Undo cũ không được bỏ qua việc cập nhật bài học', async () => {
    await seed(1);
    const result = (await beginPractice(deps, { userId: TEST_USER_ID, size: 15 }))!;
    const done = await ratePractice(deps, {
      userId: TEST_USER_ID,
      sessionId: result.id,
      itemId: result.items[0].id,
      outcome: 'remembered',
    });
    await expect(
      undoOutcome(
        { reviews: prismaReviewRepository, now: () => NOW },
        {
          userId: TEST_USER_ID,
          outcomeId: done.items[0].answer!.id!,
        },
      ),
    ).rejects.toThrow('ERR_UNDO_NOT_ALLOWED');
    expect((await prismaPracticeRepository.overview(TEST_USER_ID, NOW)).completedToday).toBe(1);
  });
});
