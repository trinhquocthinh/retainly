import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import { prismaCardListQuery } from './prisma-card-list-query';

const SOURCE_A = '00000000-0000-0000-0000-0000000000b1';
const SOURCE_B = '00000000-0000-0000-0000-0000000000b2';
const SOURCE_OTHER = '00000000-0000-0000-0000-0000000000b3';

beforeEach(async () => {
  await resetDatabase();

  await testPrisma.source.createMany({
    data: [
      {
        id: SOURCE_A,
        userId: TEST_USER_ID,
        url: 'https://example.com/a',
        title: 'Nguồn A',
        cleanText: '# A',
      },
      {
        id: SOURCE_B,
        userId: TEST_USER_ID,
        url: 'https://example.com/b',
        title: 'Nguồn B',
        cleanText: '# B',
      },
      {
        id: SOURCE_OTHER,
        userId: OTHER_USER_ID,
        url: 'https://example.com/other',
        title: 'Nguồn user khác',
        cleanText: '# Other',
      },
    ],
  });

  await testPrisma.card.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000101',
        userId: TEST_USER_ID,
        sourceId: SOURCE_A,
        front: 'Mới hơn, ID nhỏ',
        back: 'A1',
        createdAt: new Date('2026-09-16T02:00:00.000Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000102',
        userId: TEST_USER_ID,
        sourceId: SOURCE_A,
        front: 'Mới hơn, ID lớn',
        back: 'A2',
        createdAt: new Date('2026-09-16T02:00:00.000Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000103',
        userId: TEST_USER_ID,
        sourceId: SOURCE_B,
        front: 'Cũ hơn',
        back: 'B1',
        createdAt: new Date('2026-09-16T01:00:00.000Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000104',
        userId: OTHER_USER_ID,
        sourceId: SOURCE_OTHER,
        front: 'Không được lộ',
        back: 'Secret',
        createdAt: new Date('2026-09-16T03:00:00.000Z'),
      },
    ],
  });
});

describe('E3-S1-T1 — Prisma Card list query', () => {
  it('cô lập user, sắp xếp ổn định và phân trang không trùng', async () => {
    const first = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      page: 1,
      pageSize: 2,
    });
    const second = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      page: 2,
      pageSize: 2,
    });
    const outside = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      page: 3,
      pageSize: 2,
    });

    expect(first.totalItems).toBe(3);
    expect(first.items.map((card) => card.id)).toEqual([
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000101',
    ]);
    expect(second.items.map((card) => card.id)).toEqual(['00000000-0000-0000-0000-000000000103']);
    expect(outside).toEqual({
      items: [],
      totalItems: 3,
    });
  });

  it('chỉ trả projection dành cho Card Library', async () => {
    const result = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      page: 1,
      pageSize: 1,
    });

    expect(result.items[0]).toEqual({
      id: '00000000-0000-0000-0000-000000000102',
      sourceId: SOURCE_A,
      front: 'Mới hơn, ID lớn',
      back: 'A2',
      note: null,
      createdAt: new Date('2026-09-16T02:00:00.000Z'),
    });
  });

  it('lọc sourceId trong phạm vi user hiện tại', async () => {
    const result = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      sourceId: SOURCE_B,
      page: 1,
      pageSize: 20,
    });

    expect(result.totalItems).toBe(1);
    expect(result.items.map((card) => card.sourceId)).toEqual([SOURCE_B]);
  });

  it('source không tồn tại trả danh sách rỗng', async () => {
    const result = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      sourceId: '00000000-0000-0000-0000-0000000000cc',
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
      items: [],
      totalItems: 0,
    });
  });

  it('source của user khác cũng trả danh sách rỗng', async () => {
    const result = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      sourceId: SOURCE_OTHER,
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({
      items: [],
      totalItems: 0,
    });
  });

  it('migration tạo đủ hai composite index', async () => {
    const indexes = await testPrisma.$queryRaw<{ indexname: string }[]>`
      select indexname
      from pg_indexes
      where schemaname = current_schema()
        and tablename = 'cards'
    `;

    expect(indexes.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        'cards_user_id_created_at_id_idx',
        'cards_user_id_source_id_created_at_id_idx',
      ]),
    );
  });
});
