import { beforeEach, describe, expect, it } from 'vitest';

import { createInitialSchedule } from '../../review/domain/review-scheduler';
import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { prismaCardRepository } from './prisma-card-repository';

const REVIEWED_AT = new Date('2026-09-15T12:00:00.000Z');

async function seedReviewedCard(userId: string) {
  return testPrisma.card.create({
    data: {
      userId,
      front: 'Câu hỏi cũ',
      back: 'Câu trả lời cũ',
      schedule: {
        create: {
          state: 'review',
          dueDate: new Date('2026-09-20T12:00:00.000Z'),
          intervalDays: 5,
          stability: 4,
          difficulty: 5,
          reps: 1,
          lastReviewedAt: REVIEWED_AT,
        },
      },
      outcomes: {
        create: {
          outcome: 'remembered',
          reviewedAt: REVIEWED_AT,
        },
      },
    },
    include: {
      schedule: true,
      outcomes: true,
    },
  });
}

beforeEach(resetDatabase);

describe('E1-S4-T9 — lưu thẻ xuống Postgres thật', () => {
  it('timestamptz lưu đúng thời điểm, không lệch theo múi giờ của session', async () => {
    const KNOWN = new Date('2026-03-01T10:00:00.000Z');

    await prismaCardRepository.create({
      userId: TEST_USER_ID,
      front: 'Hỏi',
      back: 'Đáp',
      schedule: createInitialSchedule(KNOWN),
    });

    // Đọc epoch bằng SQL thuần, KHÔNG đọc lại qua ORM. Lỗi múi giờ tìm thấy ở
    // E1-S2-T4 có hai sai số ngược chiều triệt tiêu nhau, nên mọi đường đọc qua
    // ORM đều báo đúng. Chỉ phép so epoch trực tiếp mới bắt được.
    const rows = await testPrisma.$queryRaw<{ epoch: bigint }[]>`
      select extract(epoch from due_date)::bigint as epoch from review_schedules`;

    expect(Number(rows[0].epoch)).toBe(KNOWN.getTime() / 1000);
  });

  it('tạo thẻ thì lịch ôn được tạo cùng lúc (BR-003)', async () => {
    await prismaCardRepository.create({
      userId: TEST_USER_ID,
      front: 'Hỏi',
      back: 'Đáp',
      schedule: createInitialSchedule(new Date()),
    });

    const cards = await testPrisma.card.count();
    const schedules = await testPrisma.reviewSchedule.count();

    expect(cards).toBe(1);
    expect(schedules).toBe(1);
  });
});

describe('E3-S1-T2 — sửa và xóa card trên Postgres thật', () => {
  it('TC-025: cập nhật nội dung không thay đổi schedule hoặc outcomes', async () => {
    const seeded = await seedReviewedCard(TEST_USER_ID);

    const updated = await prismaCardRepository.updateOwned({
      userId: TEST_USER_ID,
      cardId: seeded.id,
      content: {
        front: 'Câu hỏi mới',
      },
    });

    const schedule = await testPrisma.reviewSchedule.findUniqueOrThrow({
      where: { cardId: seeded.id },
    });
    const outcomes = await testPrisma.reviewOutcome.findMany({
      where: { cardId: seeded.id },
    });

    expect(updated).toMatchObject({
      id: seeded.id,
      front: 'Câu hỏi mới',
      back: 'Câu trả lời cũ',
    });
    expect(schedule).toEqual(seeded.schedule);
    expect(outcomes).toEqual(seeded.outcomes);
  });

  it('ownership filter không sửa hoặc xóa card của user khác', async () => {
    const seeded = await seedReviewedCard(OTHER_USER_ID);

    await expect(
      prismaCardRepository.updateOwned({
        userId: TEST_USER_ID,
        cardId: seeded.id,
        content: { front: 'Không được phép' },
      }),
    ).resolves.toBeNull();

    await expect(
      prismaCardRepository.deleteOwned({
        userId: TEST_USER_ID,
        cardId: seeded.id,
      }),
    ).resolves.toBe(false);

    const card = await testPrisma.card.findUniqueOrThrow({
      where: { id: seeded.id },
    });

    expect(card.front).toBe('Câu hỏi cũ');
  });

  it('TC-028: xóa card cascade schedule và toàn bộ outcomes', async () => {
    const seeded = await seedReviewedCard(TEST_USER_ID);

    await expect(
      prismaCardRepository.deleteOwned({
        userId: TEST_USER_ID,
        cardId: seeded.id,
      }),
    ).resolves.toBe(true);

    const [cards, schedules, outcomes] = await Promise.all([
      testPrisma.card.count({ where: { id: seeded.id } }),
      testPrisma.reviewSchedule.count({
        where: { cardId: seeded.id },
      }),
      testPrisma.reviewOutcome.count({
        where: { cardId: seeded.id },
      }),
    ]);

    expect({
      cards,
      schedules,
      outcomes,
    }).toEqual({
      cards: 0,
      schedules: 0,
      outcomes: 0,
    });
  });
});
