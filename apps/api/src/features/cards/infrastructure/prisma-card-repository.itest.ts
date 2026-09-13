import { beforeEach, describe, expect, it } from 'vitest';

import { createInitialSchedule } from '../../review/domain/review-scheduler';
import { resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { prismaCardRepository } from './prisma-card-repository';

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
