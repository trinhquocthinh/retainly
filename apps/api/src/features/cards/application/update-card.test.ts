import { describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/errors';
import { updateCard, type CardUpdateRepository, type UpdatedCard } from './update-card';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const CARD_ID = '00000000-0000-0000-0000-0000000000c1';
const NOW = new Date('2026-09-16T12:00:00.000Z');

const EXISTING_CARD: UpdatedCard = {
  id: CARD_ID,
  sourceId: null,
  front: 'Câu hỏi cũ',
  back: 'Câu trả lời cũ',
  note: 'Ghi chú cũ',
  createdAt: NOW,
};

type UpdateInput = Parameters<CardUpdateRepository['updateOwned']>[0];

function fakeRepository(result: UpdatedCard | null): CardUpdateRepository & {
  inputs: UpdateInput[];
} {
  const inputs: UpdateInput[] = [];

  return {
    inputs,
    async updateOwned(input) {
      inputs.push(input);

      if (result === null) return null;

      return {
        ...result,
        ...input.content,
      };
    },
  };
}

describe('E3-S1-T2 — updateCard', () => {
  it('TC-025: cập nhật riêng front và giữ nguyên back', async () => {
    const cards = fakeRepository(EXISTING_CARD);

    const updated = await updateCard(
      { cards },
      {
        userId: USER_ID,
        cardId: CARD_ID,
        front: '  Câu hỏi mới  ',
      },
    );

    expect(updated).toEqual({
      ...EXISTING_CARD,
      front: 'Câu hỏi mới',
    });
    expect(cards.inputs).toEqual([
      {
        userId: USER_ID,
        cardId: CARD_ID,
        content: { front: 'Câu hỏi mới' },
      },
    ]);
  });

  it('TC-026: card không thuộc user trả ERR_CARD_NOT_FOUND', async () => {
    const cards = fakeRepository(null);

    await expect(
      updateCard(
        { cards },
        {
          userId: USER_ID,
          cardId: CARD_ID,
          front: 'Câu hỏi mới',
        },
      ),
    ).rejects.toThrow(new AppError('ERR_CARD_NOT_FOUND'));
  });

  it('TC-027: front rỗng bị từ chối trước khi gọi repository', async () => {
    const cards = fakeRepository(EXISTING_CARD);

    await expect(
      updateCard(
        { cards },
        {
          userId: USER_ID,
          cardId: CARD_ID,
          front: '   ',
        },
      ),
    ).rejects.toThrow(new AppError('ERR_EMPTY_FRONT'));

    expect(cards.inputs).toHaveLength(0);
  });

  it('body không có front, back hoặc note trả ERR_BAD_REQUEST', async () => {
    const cards = fakeRepository(EXISTING_CARD);

    await expect(
      updateCard(
        { cards },
        {
          userId: USER_ID,
          cardId: CARD_ID,
        },
      ),
    ).rejects.toThrow(new AppError('ERR_BAD_REQUEST'));

    expect(cards.inputs).toHaveLength(0);
  });
});

describe('E7-S1-T2 — TC-055 sửa ghi chú thẻ', () => {
  it('chỉ gửi note thì chỉ ghi đè note, đã trim', async () => {
    const cards = fakeRepository(EXISTING_CARD);

    const updated = await updateCard(
      { cards },
      { userId: USER_ID, cardId: CARD_ID, note: '  Ghi chú mới  ' },
    );

    expect(updated.note).toBe('Ghi chú mới');
    expect(cards.inputs[0]?.content).toEqual({ note: 'Ghi chú mới' });
  });

  it.each([null, '   '])('note %j là xoá ghi chú', async (note) => {
    const cards = fakeRepository(EXISTING_CARD);

    const updated = await updateCard({ cards }, { userId: USER_ID, cardId: CARD_ID, note });

    expect(updated.note).toBeNull();
    expect(cards.inputs[0]?.content).toEqual({ note: null });
  });
});
