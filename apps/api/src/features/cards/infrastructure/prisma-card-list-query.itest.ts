import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, testPrisma, TEST_USER_ID } from '../../../shared/test/db';
import type { CardListQueryInput } from '../application/list-cards';
import { prismaCardListQuery } from './prisma-card-list-query';

const SOURCE_A = '00000000-0000-0000-0000-0000000000b1';
const SOURCE_B = '00000000-0000-0000-0000-0000000000b2';
const SOURCE_OTHER = '00000000-0000-0000-0000-0000000000b3';

const TOPIC_ARCH = '00000000-0000-0000-0000-0000000000a1';
const TOPIC_MEMORY = '00000000-0000-0000-0000-0000000000a2';
const TOPIC_EMPTY = '00000000-0000-0000-0000-0000000000a3';
const TOPIC_OTHER = '00000000-0000-0000-0000-0000000000a4';

const CARD_NEWER_SMALL_ID = '00000000-0000-0000-0000-000000000101';
const CARD_NEWER_LARGE_ID = '00000000-0000-0000-0000-000000000102';
const CARD_OLDER = '00000000-0000-0000-0000-000000000103';
const CARD_UNREVIEWED = '00000000-0000-0000-0000-000000000105';

type Seed = {
  id: string;
  userId: string;
  sourceId?: string;
  topicId?: string;
  front: string;
  back: string;
  note?: string;
  createdAt: string;
  schedule: {
    state: 'new' | 'review';
    dueDate: string;
    stability: number;
    difficulty: number;
    lastReviewedAt: string | null;
  };
};

async function seedCard({ schedule, createdAt, ...card }: Seed) {
  await testPrisma.card.create({
    data: {
      ...card,
      createdAt: new Date(createdAt),
      schedule: {
        create: {
          ...schedule,
          dueDate: new Date(schedule.dueDate),
          lastReviewedAt:
            schedule.lastReviewedAt === null ? null : new Date(schedule.lastReviewedAt),
        },
      },
    },
  });
}

function list(input: Partial<CardListQueryInput> = {}) {
  return prismaCardListQuery.list({
    userId: TEST_USER_ID,
    sort: 'recent',
    page: 1,
    pageSize: 20,
    ...input,
  });
}

async function idsOf(input: Partial<CardListQueryInput>) {
  return (await list(input)).items.map((card) => card.id);
}

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

  await testPrisma.knowledgeTopic.createMany({
    data: [
      { id: TOPIC_ARCH, userId: TEST_USER_ID, name: 'Kiến trúc' },
      { id: TOPIC_MEMORY, userId: TEST_USER_ID, name: 'Trí nhớ' },
      { id: TOPIC_EMPTY, userId: TEST_USER_ID, name: 'Zeta trống' },
      { id: TOPIC_OTHER, userId: OTHER_USER_ID, name: 'Topic user khác' },
    ],
  });

  // Hai thẻ đầu cùng createdAt, S, D, hạn ôn — chỉ id phân định thứ tự.
  await seedCard({
    id: CARD_NEWER_SMALL_ID,
    userId: TEST_USER_ID,
    sourceId: SOURCE_A,
    topicId: TOPIC_ARCH,
    front: 'Mới hơn, ID nhỏ',
    back: 'Định lý [[CAP]] cho hệ phân tán',
    createdAt: '2026-09-16T02:00:00.000Z',
    schedule: {
      state: 'review',
      dueDate: '2026-09-20T00:00:00.000Z',
      stability: 10,
      difficulty: 5,
      lastReviewedAt: '2026-09-10T00:00:00.000Z',
    },
  });
  await seedCard({
    id: CARD_NEWER_LARGE_ID,
    userId: TEST_USER_ID,
    sourceId: SOURCE_A,
    topicId: TOPIC_ARCH,
    front: 'Mới hơn, ID lớn',
    back: 'A2',
    note: 'Mất 50% trong `24h` đầu tiên',
    createdAt: '2026-09-16T02:00:00.000Z',
    schedule: {
      state: 'review',
      dueDate: '2026-09-20T00:00:00.000Z',
      stability: 10,
      difficulty: 5,
      lastReviewedAt: '2026-09-10T00:00:00.000Z',
    },
  });
  await seedCard({
    id: CARD_OLDER,
    userId: TEST_USER_ID,
    sourceId: SOURCE_B,
    topicId: TOPIC_MEMORY,
    front: 'Định **luật** Ebbinghaus',
    back: 'B1',
    createdAt: '2026-09-16T01:00:00.000Z',
    schedule: {
      state: 'review',
      dueDate: '2026-09-18T00:00:00.000Z',
      stability: 2,
      difficulty: 8,
      lastReviewedAt: '2026-09-15T00:00:00.000Z',
    },
  });
  // Thẻ chưa ôn: S = D = 0 nhưng phải đứng cuối khi sắp theo S/D.
  await seedCard({
    id: CARD_UNREVIEWED,
    userId: TEST_USER_ID,
    front: 'Đà Nẵng',
    back: 'Thành phố',
    createdAt: '2026-09-16T00:30:00.000Z',
    schedule: {
      state: 'new',
      dueDate: '2026-09-16T00:30:00.000Z',
      stability: 0,
      difficulty: 0,
      lastReviewedAt: null,
    },
  });
  await seedCard({
    id: '00000000-0000-0000-0000-000000000104',
    userId: OTHER_USER_ID,
    sourceId: SOURCE_OTHER,
    topicId: TOPIC_OTHER,
    front: 'Định luật không được lộ',
    back: 'Secret 50%',
    createdAt: '2026-09-16T03:00:00.000Z',
    schedule: {
      state: 'new',
      dueDate: '2026-09-16T03:00:00.000Z',
      stability: 0,
      difficulty: 0,
      lastReviewedAt: null,
    },
  });
});

describe('E3-S1-T1 — Prisma Card list query', () => {
  it('cô lập user, sắp xếp ổn định và phân trang không trùng', async () => {
    const first = await list({ page: 1, pageSize: 2 });
    const second = await list({ page: 2, pageSize: 2 });
    const outside = await list({ page: 3, pageSize: 2 });

    expect(first.totalItems).toBe(4);
    expect(first.items.map((card) => card.id)).toEqual([CARD_NEWER_LARGE_ID, CARD_NEWER_SMALL_ID]);
    expect(second.items.map((card) => card.id)).toEqual([CARD_OLDER, CARD_UNREVIEWED]);
    expect(outside.items).toEqual([]);
    expect(outside.totalItems).toBe(4);
  });

  it('trả projection cho Card Library kèm Topic, nguồn và tóm tắt lịch', async () => {
    const result = await list({ pageSize: 1 });

    expect(result.items[0]).toEqual({
      id: CARD_NEWER_LARGE_ID,
      sourceId: SOURCE_A,
      front: 'Mới hơn, ID lớn',
      back: 'A2',
      note: 'Mất 50% trong `24h` đầu tiên',
      createdAt: new Date('2026-09-16T02:00:00.000Z'),
      topic: { id: TOPIC_ARCH, name: 'Kiến trúc' },
      source: { id: SOURCE_A, title: 'Nguồn A' },
      schedule: {
        state: 'review',
        dueDate: new Date('2026-09-20T00:00:00.000Z'),
        stability: 10,
        difficulty: 5,
        lastReviewedAt: new Date('2026-09-10T00:00:00.000Z'),
      },
    });
  });

  it('thẻ không có Topic, không có nguồn thì trả null', async () => {
    const [card] = (await list({ topicId: null })).items;

    expect(card).toMatchObject({ id: CARD_UNREVIEWED, topic: null, source: null });
  });

  it('lọc sourceId trong phạm vi user hiện tại', async () => {
    const result = await list({ sourceId: SOURCE_B });

    expect(result.totalItems).toBe(1);
    expect(result.items.map((card) => card.sourceId)).toEqual([SOURCE_B]);
  });

  it.each([
    ['không tồn tại', '00000000-0000-0000-0000-0000000000cc'],
    ['của user khác', SOURCE_OTHER],
  ])('source %s trả danh sách rỗng', async (_, sourceId) => {
    const result = await list({ sourceId });

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
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

describe('E9-S1-T1 — tìm kiếm', () => {
  it.each([
    ['xuyên qua **đậm** ở mặt trước', 'định luật', [CARD_OLDER]],
    ['xuyên qua [[đục lỗ]] ở mặt sau', 'lý CAP cho', [CARD_NEWER_SMALL_ID]],
    ['xuyên qua `code` trong ghi chú', '24h đầu', [CARD_NEWER_LARGE_ID]],
    ['không phân biệt hoa thường', 'ĐỊNH LUẬT', [CARD_OLDER]],
    ['không phân biệt dấu', 'da nang', [CARD_UNREVIEWED]],
    ['bỏ dấu cả ở từ khoá', 'dinh', [CARD_NEWER_SMALL_ID, CARD_OLDER]],
    ['% là chữ, không phải ký tự đại diện', '50%', [CARD_NEWER_LARGE_ID]],
    ['_ là chữ, không phải ký tự đại diện', '_', []],
  ])('%s: "%s"', async (_, keyword, expected) => {
    expect(await idsOf({ keyword })).toEqual(expected);
  });

  it('không trả thẻ khớp từ khoá của user khác', async () => {
    const result = await list({ keyword: 'không được lộ' });

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });
});

describe('E9-S1-T1 — sắp xếp', () => {
  it.each([
    ['due', [CARD_UNREVIEWED, CARD_OLDER, CARD_NEWER_SMALL_ID, CARD_NEWER_LARGE_ID]],
    ['stability', [CARD_OLDER, CARD_NEWER_SMALL_ID, CARD_NEWER_LARGE_ID, CARD_UNREVIEWED]],
    ['difficulty', [CARD_OLDER, CARD_NEWER_SMALL_ID, CARD_NEWER_LARGE_ID, CARD_UNREVIEWED]],
  ] as const)('sort=%s', async (sort, expected) => {
    expect(await idsOf({ sort })).toEqual(expected);
  });

  it('phân trang theo S không trùng, không sót khi S hoà nhau', async () => {
    const pages = await Promise.all(
      [1, 2, 3, 4].map((page) => idsOf({ sort: 'stability', page, pageSize: 1 })),
    );

    expect(pages.flat()).toEqual(await idsOf({ sort: 'stability' }));
  });
});

describe('E9-S1-T1 — lọc và đếm theo Topic', () => {
  it('lọc một Topic hoặc "Chưa gán"', async () => {
    expect(await idsOf({ topicId: TOPIC_ARCH })).toEqual([
      CARD_NEWER_LARGE_ID,
      CARD_NEWER_SMALL_ID,
    ]);
    expect(await idsOf({ topicId: null })).toEqual([CARD_UNREVIEWED]);
  });

  it('Topic của user khác trả danh sách rỗng', async () => {
    const result = await list({ topicId: TOPIC_OTHER });

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });

  it('đếm mọi Topic của user, kể cả Topic 0 thẻ, và bỏ qua bộ lọc Topic', async () => {
    const result = await list({ topicId: TOPIC_MEMORY });

    expect(result.totalItems).toBe(1);
    expect(result.topicCounts).toEqual({
      all: 4,
      unassigned: 1,
      topics: [
        { id: TOPIC_ARCH, name: 'Kiến trúc', cardCount: 2 },
        { id: TOPIC_MEMORY, name: 'Trí nhớ', cardCount: 1 },
        { id: TOPIC_EMPTY, name: 'Zeta trống', cardCount: 0 },
      ],
    });
  });

  it('số đếm tính theo từ khoá', async () => {
    const result = await list({ keyword: 'dinh' });

    expect(result.topicCounts).toEqual({
      all: 2,
      unassigned: 0,
      topics: [
        { id: TOPIC_ARCH, name: 'Kiến trúc', cardCount: 1 },
        { id: TOPIC_MEMORY, name: 'Trí nhớ', cardCount: 1 },
        { id: TOPIC_EMPTY, name: 'Zeta trống', cardCount: 0 },
      ],
    });
  });
});
