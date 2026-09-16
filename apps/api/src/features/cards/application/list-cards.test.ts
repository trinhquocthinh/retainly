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
      {
        userId: USER,
        sourceId: SOURCE,
        page: 2,
        pageSize: 20,
      },
    );

    expect(result).toEqual({
      items: [],
      pagination: {
        page: 2,
        pageSize: 20,
        totalItems: 41,
        totalPages: 3,
      },
    });
  });

  it('truyền nguyên vẹn input sang query port', async () => {
    const { query, inputs } = fakeQuery(0);

    await listCards(
      { cards: query },
      {
        userId: USER,
        page: 3,
        pageSize: 10,
      },
    );

    expect(inputs).toEqual([
      {
        userId: USER,
        page: 3,
        pageSize: 10,
      },
    ]);
  });

  it('trả totalPages bằng 0 khi không có thẻ', async () => {
    const { query } = fakeQuery(0);

    const result = await listCards(
      { cards: query },
      {
        userId: USER,
        page: 1,
        pageSize: 20,
      },
    );

    expect(result.pagination.totalPages).toBe(0);
  });
});
