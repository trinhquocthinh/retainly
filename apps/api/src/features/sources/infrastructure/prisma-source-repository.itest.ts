import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { prismaSourceRepository } from './prisma-source-repository';

beforeEach(resetDatabase);

const sampleSource = {
  userId: TEST_USER_ID,
  url: 'https://example.com/bai-viet',
  title: 'Bài viết mẫu',
  cleanText: '## Tiêu đề\n\nNội dung sạch.',
};

describe('E2-S1-T3 — lưu Source xuống Postgres thật', () => {
  it('lưu đủ url, title, cleanText và sinh id', async () => {
    const created = await prismaSourceRepository.create(sampleSource);

    const row = await testPrisma.source.findUniqueOrThrow({ where: { id: created.id } });
    expect(row).toMatchObject(sampleSource);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('nhiều Card cùng trỏ về một Source (BR-010)', async () => {
    const source = await prismaSourceRepository.create(sampleSource);

    await testPrisma.card.createMany({
      data: [
        { userId: TEST_USER_ID, sourceId: source.id, front: 'Hỏi 1', back: 'Đáp 1' },
        { userId: TEST_USER_ID, sourceId: source.id, front: 'Hỏi 2', back: 'Đáp 2' },
      ],
    });

    expect(await testPrisma.card.count({ where: { sourceId: source.id } })).toBe(2);
  });

  it('xoá Source thì Card vẫn còn, chỉ mất liên kết (ON DELETE SET NULL)', async () => {
    const source = await prismaSourceRepository.create(sampleSource);
    await testPrisma.card.create({
      data: { userId: TEST_USER_ID, sourceId: source.id, front: 'Hỏi', back: 'Đáp' },
    });

    await testPrisma.source.delete({ where: { id: source.id } });

    const card = await testPrisma.card.findFirstOrThrow();
    expect(card.sourceId).toBeNull();
  });
});
