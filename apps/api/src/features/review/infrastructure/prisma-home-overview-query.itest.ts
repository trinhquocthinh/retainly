import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';
import { recordOutcome } from '../application/record-outcome';
import { undoOutcome } from '../application/undo-outcome';
import { endOfToday, startOfToday } from '../domain/due-window';
import { prismaHomeOverviewQuery } from './prisma-home-overview-query';
import { prismaReviewRepository } from './prisma-review-repository';

const DAY = 86_400_000;
// 12:00 giờ Việt Nam: đầu ngày 2026-09-22T17:00Z, cuối ngày 2026-09-23T16:59:59.999Z.
const NOW = new Date('2026-09-23T05:00:00Z');
const TODAY = { reviewedSince: startOfToday(NOW), dueBy: endOfToday(NOW) };

type SeedCard = {
  userId?: string;
  front?: string;
  dueDate: Date;
  topicId?: string;
  reviewedAt?: Date[];
  difficulty?: number;
  reps?: number;
};

async function seedCard({
  userId = TEST_USER_ID,
  front = 'Hỏi',
  dueDate,
  topicId,
  reviewedAt = [],
  difficulty = 0,
  reps = 0,
}: SeedCard): Promise<string> {
  const card = await testPrisma.card.create({
    data: {
      userId,
      front,
      back: 'Đáp',
      topicId,
      schedule: {
        create: {
          state: reviewedAt.length === 0 ? 'new' : 'review',
          dueDate,
          difficulty,
          reps,
          lastReviewedAt: reviewedAt.at(-1) ?? null,
        },
      },
      outcomes: { create: reviewedAt.map((at) => ({ outcome: 'remembered', reviewedAt: at })) },
    },
  });
  return card.id;
}

async function seedTopic(name: string, userId = TEST_USER_ID): Promise<string> {
  const topic = await testPrisma.knowledgeTopic.create({ data: { userId, name } });
  return topic.id;
}

beforeEach(resetDatabase);

describe('E10-S1-T1 — tiến độ hôm nay trên Postgres thật', () => {
  it('đếm theo Card khác nhau: hai lượt ôn hôm nay của một thẻ chỉ tính một', async () => {
    const tomorrow = new Date(NOW.getTime() + DAY);
    await seedCard({ dueDate: tomorrow, reviewedAt: [TODAY.reviewedSince, NOW] });
    await seedCard({ dueDate: NOW });
    await seedCard({ dueDate: new Date(NOW.getTime() - DAY) });

    await expect(prismaHomeOverviewQuery.countTodayProgress(TEST_USER_ID, TODAY)).resolves.toEqual({
      reviewed: 1,
      total: 3,
    });
  });

  it('thẻ đã ôn hôm nay mà vẫn còn hạn trong ngày chỉ nằm một lần trong tổng', async () => {
    await seedCard({ dueDate: TODAY.dueBy, reviewedAt: [NOW] });

    await expect(prismaHomeOverviewQuery.countTodayProgress(TEST_USER_ID, TODAY)).resolves.toEqual({
      reviewed: 1,
      total: 1,
    });
  });

  it('lượt ôn hôm qua, thẻ chưa tới hạn và thẻ của người khác không được tính', async () => {
    const yesterday = new Date(TODAY.reviewedSince.getTime() - 1);
    await seedCard({ dueDate: new Date(NOW.getTime() + 3 * DAY), reviewedAt: [yesterday] });
    await seedCard({ dueDate: new Date(TODAY.dueBy.getTime() + 1) });
    await seedCard({ userId: OTHER_USER_ID, dueDate: NOW, reviewedAt: [NOW] });

    await expect(prismaHomeOverviewQuery.countTodayProgress(TEST_USER_ID, TODAY)).resolves.toEqual({
      reviewed: 0,
      total: 0,
    });
  });

  it('BR-024: hoàn tác lượt ôn thì thẻ trở lại "chưa ôn", tổng giữ nguyên', async () => {
    // Hoàn tác chỉ nhận trong 10 phút nên chạy trên giờ thật.
    const now = () => new Date();
    const today = { reviewedSince: startOfToday(now()), dueBy: endOfToday(now()) };
    const cardId = await seedCard({ dueDate: now() });
    const deps = { reviews: prismaReviewRepository, now };

    const { outcomeId } = await recordOutcome(deps, {
      userId: TEST_USER_ID,
      cardId,
      outcome: 'remembered',
    });
    await expect(prismaHomeOverviewQuery.countTodayProgress(TEST_USER_ID, today)).resolves.toEqual({
      reviewed: 1,
      total: 1,
    });

    await undoOutcome(deps, { userId: TEST_USER_ID, outcomeId });
    await expect(prismaHomeOverviewQuery.countTodayProgress(TEST_USER_ID, today)).resolves.toEqual({
      reviewed: 0,
      total: 1,
    });
  });
});

describe('E10-S1-T1 — tổng quan thư viện, đến hạn theo Topic, lịch sắp tới', () => {
  it('đếm tổng thẻ, số Topic có thẻ và thẻ đã ôn có D vượt ngưỡng', async () => {
    const fsrs = await seedTopic('FSRS');
    await seedTopic('Topic rỗng');
    const reviewed = [new Date(NOW.getTime() - DAY)];
    await seedCard({ dueDate: NOW, topicId: fsrs, reviewedAt: reviewed, difficulty: 8 });
    await seedCard({ dueDate: NOW, topicId: fsrs, reviewedAt: reviewed, difficulty: 7.5 });
    await seedCard({ dueDate: NOW, difficulty: 9 }); // chưa ôn: D không có ý nghĩa
    await seedCard({ userId: OTHER_USER_ID, dueDate: NOW, reviewedAt: reviewed, difficulty: 9 });

    await expect(prismaHomeOverviewQuery.summarizeLibrary(TEST_USER_ID, 7.5)).resolves.toEqual({
      totalCards: 3,
      topicCount: 1,
      difficultCards: 1,
    });
  });

  it('gom thẻ đến hạn theo Topic, nhiều thẻ trước, nhóm không Topic xếp sau khi hoà', async () => {
    const fsrs = await seedTopic('FSRS');
    const hexagonal = await seedTopic('Hexagonal');
    await seedCard({ dueDate: NOW, topicId: hexagonal });
    await seedCard({ dueDate: NOW, topicId: hexagonal });
    await seedCard({ dueDate: TODAY.dueBy, topicId: fsrs });
    await seedCard({ dueDate: NOW });
    await seedCard({ dueDate: new Date(NOW.getTime() + DAY), topicId: fsrs });
    await seedCard({ userId: OTHER_USER_ID, dueDate: NOW });

    await expect(
      prismaHomeOverviewQuery.countDueByTopic(TEST_USER_ID, TODAY.dueBy),
    ).resolves.toEqual([
      { topic: { id: hexagonal, name: 'Hexagonal' }, count: 2 },
      { topic: { id: fsrs, name: 'FSRS' }, count: 1 },
      { topic: null, count: 1 },
    ]);
  });

  it('lấy thẻ hạn sau hôm nay, gần nhất trước, kèm Topic và số lần đã ôn', async () => {
    const fsrs = await seedTopic('FSRS');
    const in3Days = new Date(NOW.getTime() + 3 * DAY);
    const tomorrow = new Date(NOW.getTime() + DAY);
    await seedCard({ front: 'Hôm nay', dueDate: TODAY.dueBy });
    const later = await seedCard({ front: 'Ba ngày nữa', dueDate: in3Days, reps: 4 });
    const next = await seedCard({ front: 'Ngày mai', dueDate: tomorrow, topicId: fsrs, reps: 2 });
    await seedCard({ front: 'Tuần sau', dueDate: new Date(NOW.getTime() + 7 * DAY) });
    await seedCard({ userId: OTHER_USER_ID, front: 'Của người khác', dueDate: tomorrow });

    await expect(
      prismaHomeOverviewQuery.findUpcoming(TEST_USER_ID, { dueAfter: TODAY.dueBy, limit: 2 }),
    ).resolves.toEqual([
      {
        id: next,
        front: 'Ngày mai',
        back: 'Đáp',
        topic: { id: fsrs, name: 'FSRS' },
        dueDate: tomorrow,
        reps: 2,
      },
      { id: later, front: 'Ba ngày nữa', back: 'Đáp', topic: null, dueDate: in3Days, reps: 4 },
    ]);
  });
});
