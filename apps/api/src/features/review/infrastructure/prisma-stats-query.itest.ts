import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';
import { endOfToday } from '../domain/due-window';
import { prismaStatsQuery } from './prisma-stats-query';

const DAY = 86_400_000;
// 12:00 Thứ Năm 24/09 giờ Việt Nam; tuần bắt đầu 00:00 Thứ Hai 21/09 = 2026-09-20T17:00Z.
const NOW = new Date('2026-09-24T05:00:00Z');
const SINCE = new Date('2026-09-20T17:00:00Z');
const BEFORE_SINCE = new Date(SINCE.getTime() - 1);

type Review = { at: Date; outcome?: 'remembered' | 'forgotten' };

type SeedCard = {
  userId?: string;
  topicId?: string;
  dueDate?: Date;
  reviews?: Review[];
  stability?: number;
  difficulty?: number;
};

async function seedCard({
  userId = TEST_USER_ID,
  topicId,
  dueDate = new Date(NOW.getTime() + 7 * DAY),
  reviews = [],
  stability = 0,
  difficulty = 0,
}: SeedCard): Promise<void> {
  await testPrisma.card.create({
    data: {
      userId,
      front: 'Hỏi',
      back: 'Đáp',
      topicId,
      schedule: {
        create: {
          state: reviews.length === 0 ? 'new' : 'review',
          dueDate,
          stability,
          difficulty,
          lastReviewedAt: reviews.at(-1)?.at ?? null,
        },
      },
      outcomes: {
        create: reviews.map(({ at, outcome = 'remembered' }) => ({ outcome, reviewedAt: at })),
      },
    },
  });
}

async function seedTopic(name: string): Promise<string> {
  const topic = await testPrisma.knowledgeTopic.create({ data: { userId: TEST_USER_ID, name } });
  return topic.id;
}

beforeEach(resetDatabase);

describe('E10-S1-T3 — lượt ôn theo khoảng trên Postgres thật', () => {
  it('đếm lượt nhớ / tổng lượt từ mốc lọc; không mốc thì lấy toàn bộ', async () => {
    await seedCard({
      reviews: [
        { at: BEFORE_SINCE, outcome: 'forgotten' },
        { at: SINCE },
        { at: NOW, outcome: 'forgotten' },
      ],
    });
    await seedCard({ reviews: [{ at: NOW }] });
    await seedCard({ userId: OTHER_USER_ID, reviews: [{ at: NOW }] });

    await expect(prismaStatsQuery.countOutcomes(TEST_USER_ID, SINCE)).resolves.toEqual({
      remembered: 2,
      total: 3,
    });
    await expect(prismaStatsQuery.countOutcomes(TEST_USER_ID, null)).resolves.toEqual({
      remembered: 2,
      total: 4,
    });
  });

  it('gom lượt ôn theo ngày giờ Việt Nam, bỏ lượt trước mốc và của người khác', async () => {
    const mondayEarly = new Date('2026-09-20T17:30:00Z'); // 00:30 Thứ Hai giờ VN
    await seedCard({ reviews: [{ at: BEFORE_SINCE }, { at: mondayEarly }, { at: NOW }] });
    await seedCard({ reviews: [{ at: NOW, outcome: 'forgotten' }] });
    await seedCard({ userId: OTHER_USER_ID, reviews: [{ at: NOW }] });

    await expect(prismaStatsQuery.countReviewsByDay(TEST_USER_ID, SINCE)).resolves.toEqual([
      { date: '2026-09-21', reviews: 1 },
      { date: '2026-09-24', reviews: 2 },
    ]);
  });
});

describe('E10-S1-T3 — vùng bền vững', () => {
  it('chỉ đếm thẻ đã ôn có S vượt ngưỡng, trên tổng mọi thẻ của user', async () => {
    const reviews = [{ at: NOW }];
    await seedCard({ reviews, stability: 31 });
    await seedCard({ reviews, stability: 30 });
    await seedCard({ stability: 40 }); // chưa ôn: S không có ý nghĩa
    await seedCard({ userId: OTHER_USER_ID, reviews, stability: 90 });

    await expect(prismaStatsQuery.countDurable(TEST_USER_ID, 30)).resolves.toEqual({
      cards: 1,
      totalCards: 3,
    });
  });
});

describe('E10-S1-T3 — tỷ lệ quên và độ khó theo Topic', () => {
  it('Topic có lượt ôn trong khoảng, tỷ lệ quên cao trước, D và số đến hạn là số liệu hiện tại', async () => {
    const kientruc = await seedTopic('Kiến trúc');
    const fsrs = await seedTopic('FSRS');
    const cu = await seedTopic('Chỉ ôn trước mốc');
    await seedTopic('Topic rỗng');
    const dueBy = endOfToday(NOW);

    await seedCard({
      topicId: kientruc,
      dueDate: NOW,
      difficulty: 7,
      reviews: [{ at: BEFORE_SINCE }, { at: SINCE, outcome: 'forgotten' }, { at: NOW }],
    });
    await seedCard({ topicId: kientruc, difficulty: 5, reviews: [{ at: NOW }] });
    await seedCard({ topicId: kientruc, dueDate: NOW, difficulty: 9 }); // thẻ mới: đến hạn, bỏ khỏi D
    await seedCard({ topicId: fsrs, difficulty: 4, reviews: [{ at: NOW }, { at: NOW }] });
    await seedCard({ topicId: cu, dueDate: NOW, difficulty: 8, reviews: [{ at: BEFORE_SINCE }] });
    await seedCard({ reviews: [{ at: NOW, outcome: 'forgotten' }] }); // không Topic

    await expect(
      prismaStatsQuery.summarizeTopics(TEST_USER_ID, { since: SINCE, dueBy }),
    ).resolves.toEqual([
      {
        topic: { id: kientruc, name: 'Kiến trúc' },
        reviews: 3,
        forgotten: 1,
        forgetRate: 1 / 3,
        averageDifficulty: 6,
        dueCount: 2,
      },
      {
        topic: { id: fsrs, name: 'FSRS' },
        reviews: 2,
        forgotten: 0,
        forgetRate: 0,
        averageDifficulty: 4,
        dueCount: 0,
      },
    ]);

    const all = await prismaStatsQuery.summarizeTopics(TEST_USER_ID, { since: null, dueBy });
    expect(all.map(({ topic, reviews }) => [topic.name, reviews])).toEqual([
      ['Kiến trúc', 4],
      ['Chỉ ôn trước mốc', 1],
      ['FSRS', 2],
    ]);
  });

  it('Topic và lượt ôn của người khác không lọt vào', async () => {
    const other = await testPrisma.knowledgeTopic.create({
      data: { userId: OTHER_USER_ID, name: 'Của người khác' },
    });
    await seedCard({ userId: OTHER_USER_ID, topicId: other.id, reviews: [{ at: NOW }] });

    await expect(
      prismaStatsQuery.summarizeTopics(TEST_USER_ID, { since: null, dueBy: endOfToday(NOW) }),
    ).resolves.toEqual([]);
  });
});
