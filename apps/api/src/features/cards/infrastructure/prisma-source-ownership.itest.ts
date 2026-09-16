import { beforeEach, describe, expect, it } from 'vitest';

import { createInitialSchedule } from '../../review/domain/review-scheduler';
import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { prismaCardRepository } from './prisma-card-repository';
import { prismaSourceOwnership } from './prisma-source-ownership';

beforeEach(resetDatabase);

async function seedSource(userId: string): Promise<string> {
  const row = await testPrisma.source.create({
    data: {
      userId,
      url: 'https://example.com/bai-viet',
      title: 'Bài viết',
      cleanText: '# Nội dung',
    },
  });
  return row.id;
}

describe('E2-S1-T4 — thẻ liên kết nguồn trên Postgres thật', () => {
  it('nguồn của chính chủ thì belongsToUser trả true', async () => {
    const sourceId = await seedSource(TEST_USER_ID);

    expect(await prismaSourceOwnership.belongsToUser({ userId: TEST_USER_ID, sourceId })).toBe(
      true,
    );
  });

  // TC-038 (BR-002)
  it('nguồn của user khác thì belongsToUser trả false', async () => {
    const sourceId = await seedSource(OTHER_USER_ID);

    expect(await prismaSourceOwnership.belongsToUser({ userId: TEST_USER_ID, sourceId })).toBe(
      false,
    );
  });

  it('sourceId không tồn tại thì belongsToUser trả false', async () => {
    const sourceId = '00000000-0000-0000-0000-0000000000cc';

    expect(await prismaSourceOwnership.belongsToUser({ userId: TEST_USER_ID, sourceId })).toBe(
      false,
    );
  });

  it('lưu thẻ kèm sourceId thì khoá ngoại trỏ đúng nguồn', async () => {
    const sourceId = await seedSource(TEST_USER_ID);

    const created = await prismaCardRepository.create({
      userId: TEST_USER_ID,
      sourceId,
      front: 'Hỏi',
      back: 'Đáp',
      schedule: createInitialSchedule(new Date()),
    });

    const row = await testPrisma.card.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.sourceId).toBe(sourceId);
  });
});
