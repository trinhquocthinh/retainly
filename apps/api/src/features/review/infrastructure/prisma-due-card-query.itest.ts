import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { endOfToday, startOfToday } from '../domain/due-window';
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
    expect(due.map(({ card }) => card.front)).not.toContain('Thẻ ngày mai');
  });

  it('BR-008: không bao giờ trả thẻ của người khác', async () => {
    const now = new Date();
    await seedCard(TEST_USER_ID, 'Thẻ của tôi', now);
    await seedCard(OTHER_USER_ID, 'Thẻ của người khác', now);

    const due = await prismaDueCardQuery.findDueBy(TEST_USER_ID, endOfToday(now));

    expect(due.map(({ card }) => card.front)).toEqual(['Thẻ của tôi']);
  });

  it('sắp theo dueDate tăng dần — thẻ quá hạn lâu nhất lên trước', async () => {
    const now = new Date();
    await seedCard(TEST_USER_ID, 'Mới quá hạn', new Date(now.getTime() - DAY));
    await seedCard(TEST_USER_ID, 'Quá hạn lâu', new Date(now.getTime() - 5 * DAY));

    const due = await prismaDueCardQuery.findDueBy(TEST_USER_ID, endOfToday(now));

    expect(due.map(({ card }) => card.front)).toEqual(['Quá hạn lâu', 'Mới quá hạn']);
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

    expect(due.map(({ card: { front, note } }) => ({ front, note }))).toEqual([
      { front: 'Có ghi chú', note: 'Mẹo nhớ' },
      { front: 'Không ghi chú', note: null },
    ]);
  });
});

describe('E8-S1-T3 — ứng viên Ôn thêm trên Postgres thật', () => {
  // 12:00 giờ Việt Nam: đầu ngày 2026-09-22T17:00Z, cuối ngày 2026-09-23T16:59:59.999Z.
  const NOW = new Date('2026-09-23T05:00:00Z');
  const window = { dueAfter: endOfToday(NOW), notReviewedSince: startOfToday(NOW) };

  async function seedReviewed(
    userId: string,
    front: string,
    dueDate: Date,
    reviewedAt: Date,
  ): Promise<string> {
    const card = await testPrisma.card.create({
      data: {
        userId,
        front,
        back: 'Đáp',
        schedule: {
          create: { state: 'review', dueDate, stability: 4, lastReviewedAt: reviewedAt },
        },
        outcomes: { create: { outcome: 'remembered', reviewedAt } },
      },
    });
    return card.id;
  }

  it('chỉ lấy thẻ chưa đến hạn, chưa ôn hôm nay, của đúng người dùng', async () => {
    const yesterday = new Date(window.notReviewedSince.getTime() - 1);
    await seedReviewed(TEST_USER_ID, 'Hạn tuần sau', new Date(NOW.getTime() + 7 * DAY), yesterday);
    await seedReviewed(TEST_USER_ID, 'Hạn ngày mai', new Date(NOW.getTime() + DAY), yesterday);
    await seedReviewed(TEST_USER_ID, 'Đến hạn cuối ngày nay', window.dueAfter, yesterday);
    await seedReviewed(
      TEST_USER_ID,
      'Đã ôn lúc 00:00 hôm nay',
      new Date(NOW.getTime() + 3 * DAY),
      window.notReviewedSince,
    );
    await seedReviewed(OTHER_USER_ID, 'Của người khác', new Date(NOW.getTime() + DAY), yesterday);
    await testPrisma.card.create({
      data: {
        userId: TEST_USER_ID,
        front: 'Thẻ mới',
        back: 'Đáp',
        schedule: { create: { state: 'new', dueDate: new Date(NOW.getTime() + DAY) } },
      },
    });

    const candidates = await prismaDueCardQuery.findExtraCandidates(TEST_USER_ID, window);

    // Sắp hạn tăng dần — thứ tự đầu vào cho phép hoà R của tầng domain.
    expect(candidates.map(({ card }) => card.front)).toEqual(['Hạn ngày mai', 'Hạn tuần sau']);
  });

  it('trả kèm lịch FSRS đủ cột để tính R, dueDate của thẻ khớp lịch', async () => {
    const reviewedAt = new Date(NOW.getTime() - 2 * DAY);
    const dueDate = new Date(NOW.getTime() + 2 * DAY);
    const id = await seedReviewed(TEST_USER_ID, 'Có lịch', dueDate, reviewedAt);

    const [candidate] = await prismaDueCardQuery.findExtraCandidates(TEST_USER_ID, window);

    expect(candidate).toEqual({
      card: { id, front: 'Có lịch', back: 'Đáp', note: null, dueDate },
      schedule: {
        state: 'review',
        dueDate,
        intervalDays: 0,
        stability: 4,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        lastReviewedAt: reviewedAt,
      },
    });
  });
});

describe('E10-S1-T3 — hàng đợi "Ôn ngay" theo Topic', () => {
  it('chỉ trả thẻ đến hạn của Topic được chọn', async () => {
    const now = new Date();
    const [fsrs, hexagonal] = await Promise.all(
      ['FSRS', 'Hexagonal'].map((name) =>
        testPrisma.knowledgeTopic.create({ data: { userId: TEST_USER_ID, name } }),
      ),
    );
    const seedInTopic = (front: string, topicId: string | null, dueDate: Date) =>
      testPrisma.card.create({
        data: {
          userId: TEST_USER_ID,
          front,
          back: 'Đáp',
          topicId,
          schedule: { create: { state: 'review', dueDate } },
        },
      });
    await seedInTopic('FSRS quá hạn', fsrs!.id, new Date(now.getTime() - DAY));
    await seedInTopic('FSRS hôm nay', fsrs!.id, now);
    await seedInTopic('FSRS tuần sau', fsrs!.id, new Date(now.getTime() + 7 * DAY));
    await seedInTopic('Hexagonal hôm nay', hexagonal!.id, now);
    await seedInTopic('Không Topic', null, now);

    const due = await prismaDueCardQuery.findDueBy(TEST_USER_ID, endOfToday(now), fsrs!.id);

    expect(due.map(({ card }) => card.front)).toEqual(['FSRS quá hạn', 'FSRS hôm nay']);
  });
});
