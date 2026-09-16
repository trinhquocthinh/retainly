# E3-S1-T1 Card Library API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `GET /api/cards` with page-based pagination, optional `sourceId` filtering, deterministic ordering, user isolation, and supporting database indexes.

**Architecture:** A pure application use case builds pagination metadata through a dedicated `CardListQuery` port. Fastify validates/coerces HTTP query parameters, while a focused Prisma adapter reads `count` and items in one `RepeatableRead` transaction. Two composite PostgreSQL indexes cover the unfiltered and source-filtered paths.

**Tech Stack:** TypeScript 5.9, Fastify 5, Prisma 7, PostgreSQL 16, Vitest 5, Yarn 4.

**Spec:** `docs/superpowers/specs/2026-09-16-e3-s1-t1-card-library-api-design.md`

## Global Constraints

- Implement E3-S1-T1 only; SPEC-009 update, SPEC-010 delete, and frontend work remain out of scope.
- Contract: `GET /api/cards?page=1&pageSize=20&sourceId=<uuid>`.
- Defaults: `page=1`, `pageSize=20`; page size range is 1–100.
- Always use `DEFAULT_USER_ID`; never accept `userId` from the client.
- Sort by `createdAt DESC`, then `id DESC`.
- Return only `id`, `sourceId`, `front`, `back`, and `createdAt` per item.
- Missing or foreign-owned Source filters return an empty list.
- Use a Prisma `RepeatableRead` transaction for `count` and `findMany`.
- Keep current indexes and add both composite indexes from the design.
- Follow RED–GREEN–REFACTOR and observe every expected failure before production code.
- Preserve the user-owned untracked `designs/v0.1/list_card/` directory.

## File Map

| File                                                                           | Responsibility                        |
| ------------------------------------------------------------------------------ | ------------------------------------- |
| `apps/api/src/features/cards/application/list-cards.ts`                        | DTOs, query port, pagination metadata |
| `apps/api/src/features/cards/application/list-cards.test.ts`                   | Pure use-case tests                   |
| `apps/api/src/features/cards/presentation/cards-routes.ts`                     | GET schema and route                  |
| `apps/api/src/features/cards/presentation/cards-routes.test.ts`                | HTTP contract tests                   |
| `apps/api/src/features/cards/infrastructure/prisma-card-list-query.ts`         | Prisma read adapter                   |
| `apps/api/src/features/cards/infrastructure/prisma-card-list-query.itest.ts`   | PostgreSQL behavior/index tests       |
| `apps/api/src/server.ts`                                                       | Production wiring                     |
| `apps/api/prisma/schema.prisma`                                                | Composite index declarations          |
| `apps/api/prisma/migrations/20260916_e3_s1_t1_card_list_indexes/migration.sql` | Physical indexes                      |

---

### Task 1: Pure paginated list use case

**Files:**

- Create: `apps/api/src/features/cards/application/list-cards.test.ts`
- Create: `apps/api/src/features/cards/application/list-cards.ts`

**Interfaces:**

- Consumes: `{ userId, sourceId?, page, pageSize }`.
- Produces: `CardListQuery.list(input): Promise<{ items, totalItems }>`.
- Produces: `listCards(deps, input): Promise<{ items, pagination }>`.

- [ ] **Step 1: Write the failing test**

Create `list-cards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { listCards, type CardListQuery, type CardListQueryInput } from './list-cards';

const USER = '00000000-0000-0000-0000-000000000001';
const SOURCE = '00000000-0000-0000-0000-0000000000b1';

function fakeQuery(totalItems: number) {
  const inputs: CardListQueryInput[] = [];
  const query: CardListQuery = {
    async list(input) {
      inputs.push(input);
      return { items: [], totalItems };
    },
  };
  return { query, inputs };
}

describe('E3-S1-T1 — listCards', () => {
  it('tạo metadata và làm tròn totalPages lên', async () => {
    const { query } = fakeQuery(41);
    const result = await listCards(
      { cards: query },
      { userId: USER, sourceId: SOURCE, page: 2, pageSize: 20 },
    );

    expect(result).toEqual({
      items: [],
      pagination: { page: 2, pageSize: 20, totalItems: 41, totalPages: 3 },
    });
  });

  it('truyền nguyên vẹn input sang query port', async () => {
    const { query, inputs } = fakeQuery(0);
    await listCards({ cards: query }, { userId: USER, page: 3, pageSize: 10 });

    expect(inputs).toEqual([{ userId: USER, page: 3, pageSize: 10 }]);
  });

  it('trả totalPages bằng 0 khi không có thẻ', async () => {
    const { query } = fakeQuery(0);
    const result = await listCards({ cards: query }, { userId: USER, page: 1, pageSize: 20 });

    expect(result.pagination.totalPages).toBe(0);
  });
});
```

- [ ] **Step 2: Run RED**

```bash
yarn vitest run apps/api/src/features/cards/application/list-cards.test.ts
```

Expected: FAIL because `./list-cards` does not exist.

- [ ] **Step 3: Write minimal production code**

Create `list-cards.ts`:

```ts
export type CardListItem = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  createdAt: Date;
};

export type CardListQueryInput = {
  userId: string;
  sourceId?: string;
  page: number;
  pageSize: number;
};

export type CardListQuery = {
  list(input: CardListQueryInput): Promise<{ items: CardListItem[]; totalItems: number }>;
};

export async function listCards(deps: { cards: CardListQuery }, input: CardListQueryInput) {
  const result = await deps.cards.list(input);
  return {
    items: result.items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / input.pageSize),
    },
  };
}
```

- [ ] **Step 4: Run GREEN and refactor**

Run the focused test again. Expected: 3 tests PASS. Preserve the public names above.

- [ ] **Step 5: Commit Task 1**

```bash
git add apps/api/src/features/cards/application/list-cards.ts \
  apps/api/src/features/cards/application/list-cards.test.ts
git commit -m "feat(api): e3-s1-t1 add card list use case"
```

---

### Task 2: Fastify GET contract

**Files:**

- Modify: `apps/api/src/features/cards/presentation/cards-routes.test.ts:1-102`
- Modify: `apps/api/src/features/cards/presentation/cards-routes.ts:1-34`

**Interfaces:**

- Consumes: `CardListQuery` and `listCards` from Task 1.
- Produces: route dependencies `{ cards, cardList, sources, now }` and `GET /api/cards`.

- [ ] **Step 1: Add a query fake and failing route tests**

Import `DEFAULT_USER_ID`, `CardListQuery`, and `CardListQueryInput`. Add:

```ts
const listInputs: CardListQueryInput[] = [];
const fakeCardList: CardListQuery = {
  async list(input) {
    listInputs.push(input);
    return { items: [], totalItems: 21 };
  },
};
```

Update `appWithCards` to clear `listInputs` and pass `cardList: fakeCardList`. Append:

```ts
describe('E3-S1-T1 — GET /api/cards', () => {
  it('dùng mặc định page=1 và pageSize=20', async () => {
    const app = appWithCards();
    const res = await app.inject({ method: 'GET', url: '/api/cards' });

    expect(res.statusCode).toBe(200);
    expect(listInputs).toEqual([
      { userId: DEFAULT_USER_ID, page: 1, pageSize: 20, sourceId: undefined },
    ]);
    expect(res.json().pagination).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 21,
      totalPages: 2,
    });
    await app.close();
  });

  it('truyền page, pageSize và sourceId hợp lệ', async () => {
    const app = appWithCards();
    const res = await app.inject({
      method: 'GET',
      url: `/api/cards?page=2&pageSize=10&sourceId=${SOURCE}`,
    });

    expect(res.statusCode).toBe(200);
    expect(listInputs).toEqual([
      { userId: DEFAULT_USER_ID, page: 2, pageSize: 10, sourceId: SOURCE },
    ]);
    await app.close();
  });
});
```

- [ ] **Step 2: Run RED**

```bash
yarn vitest run apps/api/src/features/cards/presentation/cards-routes.test.ts
```

Expected: GET tests FAIL with HTTP 404.

- [ ] **Step 3: Implement the GET route**

Add `CardListQuery`, `listCards`, this query type, and dependency type:

```ts
type Query = { page?: number; pageSize?: number; sourceId?: string };
type CardsRouteDeps = {
  cards: CardRepository;
  cardList: CardListQuery;
  sources: SourceOwnership;
  now: () => Date;
};
```

Register before the existing POST route:

```ts
app.get<{ Querystring: Query }>(
  '/api/cards',
  {
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sourceId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
  async (request, reply) => {
    const result = await listCards(
      { cards: deps.cardList },
      {
        userId: DEFAULT_USER_ID,
        sourceId: request.query.sourceId,
        page: request.query.page ?? 1,
        pageSize: request.query.pageSize ?? 20,
      },
    );
    return reply.status(200).send(result);
  },
);
```

- [ ] **Step 4: Run GREEN for happy paths**

Run the route test again. Expected: existing POST tests and both GET tests PASS.

- [ ] **Step 5: Add validation coverage**

```ts
it.each([
  '?page=0',
  '?page=1.5',
  '?pageSize=0',
  '?pageSize=101',
  '?pageSize=abc',
  '?sourceId=khong-phai-uuid',
])('query không hợp lệ %s trả ERR_BAD_REQUEST', async (query) => {
  const app = appWithCards();
  const res = await app.inject({ method: 'GET', url: `/api/cards${query}` });

  expect(res.statusCode).toBe(400);
  expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
  expect(listInputs).toHaveLength(0);
  await app.close();
});
```

- [ ] **Step 6: Verify validation GREEN**

Run the focused route test. Expected: all route tests PASS; invalid input never reaches the query port.

- [ ] **Step 7: Commit Task 2**

```bash
git add apps/api/src/features/cards/presentation/cards-routes.ts \
  apps/api/src/features/cards/presentation/cards-routes.test.ts
git commit -m "feat(api): e3-s1-t1 expose paginated card list"
```

---

### Task 3: Prisma adapter, indexes, and production wiring

**Files:**

- Create: `apps/api/src/features/cards/infrastructure/prisma-card-list-query.itest.ts`
- Create: `apps/api/src/features/cards/infrastructure/prisma-card-list-query.ts`
- Modify: `apps/api/src/server.ts:1-24`
- Modify: `apps/api/prisma/schema.prisma:35-54`
- Create: `apps/api/prisma/migrations/20260916_e3_s1_t1_card_list_indexes/migration.sql`

**Interfaces:**

- Consumes: `CardListQuery` from Task 1.
- Produces: `prismaCardListQuery` and two named indexes.

- [ ] **Step 1: Write failing database tests**

Create `prisma-card-list-query.itest.ts`:

```ts
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
    expect(outside).toEqual({ items: [], totalItems: 3 });
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

    expect(result).toEqual({ items: [], totalItems: 0 });
  });

  it('source của user khác cũng trả danh sách rỗng', async () => {
    const result = await prismaCardListQuery.list({
      userId: TEST_USER_ID,
      sourceId: SOURCE_OTHER,
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ items: [], totalItems: 0 });
  });

  it('migration tạo đủ hai composite index', async () => {
    const indexes = await testPrisma.$queryRaw<{ indexname: string }[]>`
      select indexname from pg_indexes
      where schemaname = current_schema() and tablename = 'cards'
    `;

    expect(indexes.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        'cards_user_id_created_at_id_idx',
        'cards_user_id_source_id_created_at_id_idx',
      ]),
    );
  });
});
```

- [ ] **Step 2: Run RED**

```bash
yarn vitest run apps/api/src/features/cards/infrastructure/prisma-card-list-query.itest.ts
```

Expected: FAIL because `./prisma-card-list-query` does not exist.

- [ ] **Step 3: Implement the Prisma adapter**

Create:

```ts
import { prisma } from '../../../shared/prisma';
import type { CardListQuery } from '../application/list-cards';

export const prismaCardListQuery: CardListQuery = {
  async list(input) {
    const where = {
      userId: input.userId,
      ...(input.sourceId === undefined ? {} : { sourceId: input.sourceId }),
    };
    return prisma.$transaction(
      async (tx) => {
        const [totalItems, items] = await Promise.all([
          tx.card.count({ where }),
          tx.card.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (input.page - 1) * input.pageSize,
            take: input.pageSize,
            select: {
              id: true,
              sourceId: true,
              front: true,
              back: true,
              createdAt: true,
            },
          }),
        ]);
        return { items, totalItems };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  },
};
```

- [ ] **Step 4: Observe the index failure**

Run the integration test again. Expected: four behavior assertions PASS; the index assertion FAILS.

- [ ] **Step 5: Add schema declarations and migration**

Add inside `model Card`:

```prisma
@@index([userId, createdAt, id], map: "cards_user_id_created_at_id_idx")
@@index([userId, sourceId, createdAt, id], map: "cards_user_id_source_id_created_at_id_idx")
```

Create the migration:

```sql
CREATE INDEX "cards_user_id_created_at_id_idx"
ON "cards"("user_id", "created_at", "id");

CREATE INDEX "cards_user_id_source_id_created_at_id_idx"
ON "cards"("user_id", "source_id", "created_at", "id");
```

- [ ] **Step 6: Wire production dependencies**

Import `prismaCardListQuery` in `server.ts` and pass `cardList: prismaCardListQuery` to `registerCardsRoutes`.

- [ ] **Step 7: Verify focused GREEN**

```bash
yarn vitest run apps/api/src/features/cards/infrastructure/prisma-card-list-query.itest.ts
yarn vitest run apps/api/src/features/cards/presentation/cards-routes.test.ts
```

Expected: both commands PASS.

- [ ] **Step 8: Run the full quality gate**

```bash
yarn verify
```

Expected: Prisma migration/generation, typecheck, lint, formatting, all tests, coverage, jscpd, Knip, API build, and Web build PASS; test count exceeds 135.

- [ ] **Step 9: Inspect scope**

```bash
git diff --check
git status --short
git diff -- apps/api docs/superpowers
```

Expected: no whitespace errors; only E3-S1-T1 files are changed. `designs/v0.1/list_card/` remains untouched.

- [ ] **Step 10: Commit Task 3**

```bash
git add apps/api/src/features/cards/infrastructure/prisma-card-list-query.ts \
  apps/api/src/features/cards/infrastructure/prisma-card-list-query.itest.ts \
  apps/api/src/server.ts apps/api/prisma/schema.prisma \
  apps/api/prisma/migrations/20260916_e3_s1_t1_card_list_indexes/migration.sql
git commit -m "feat(api): e3-s1-t1 query card library"
```

- [ ] **Step 11: Verify the committed tree**

```bash
yarn verify
git status --short
```

Expected: verification exits 0; only the pre-existing untracked design directory remains.
