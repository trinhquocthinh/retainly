import { describe, expect, it } from 'vitest';

import {
  listCards,
  type CardListQuery,
  type CardListQueryInput,
  type TopicCounts,
} from './list-cards';

const USER = '00000000-0000-0000-0000-000000000001';
const SOURCE = '00000000-0000-0000-0000-0000000000b1';
const TOPIC = '00000000-0000-0000-0000-0000000000a1';

const TOPIC_COUNTS: TopicCounts = {
  all: 41,
  unassigned: 1,
  topics: [{ id: TOPIC, name: 'Kiến trúc', cardCount: 40 }],
};

function fakeQuery(totalItems: number) {
  const inputs: CardListQueryInput[] = [];
  const query: CardListQuery = {
    async list(input) {
      inputs.push(input);
      return { items: [], totalItems, topicCounts: TOPIC_COUNTS };
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
        sort: 'recent',
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
      topicCounts: TOPIC_COUNTS,
    });
  });

  it('truyền nguyên vẹn input sang query port', async () => {
    const { query, inputs } = fakeQuery(0);

    await listCards(
      { cards: query },
      {
        userId: USER,
        topicId: null,
        sort: 'stability',
        page: 3,
        pageSize: 10,
      },
    );

    expect(inputs).toEqual([
      {
        userId: USER,
        topicId: null,
        sort: 'stability',
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
        sort: 'recent',
        page: 1,
        pageSize: 20,
      },
    );

    expect(result.pagination.totalPages).toBe(0);
  });
});

describe('E9-S1-T1 — listCards: từ khoá', () => {
  it('gỡ cú pháp định dạng khỏi từ khoá trước khi xuống query port', async () => {
    const { query, inputs } = fakeQuery(0);

    await listCards(
      { cards: query },
      { userId: USER, q: '  **Định luật** ', sort: 'due', page: 1, pageSize: 20 },
    );

    expect(inputs[0]).toEqual({
      userId: USER,
      keyword: 'Định luật',
      sort: 'due',
      page: 1,
      pageSize: 20,
    });
  });

  it('từ khoá chỉ có khoảng trắng thì không lọc', async () => {
    const { query, inputs } = fakeQuery(0);

    await listCards(
      { cards: query },
      { userId: USER, q: '   ', sort: 'recent', page: 1, pageSize: 20 },
    );

    expect(inputs[0]).not.toHaveProperty('keyword');
  });
});
