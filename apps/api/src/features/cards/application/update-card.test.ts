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
    async findOwnedContent() {
      return result === null ? null : { front: result.front, back: result.back };
    },
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

describe('E7-S1-T3 — TC-058 sửa thẻ đục lỗ (BR-025)', () => {
  const CLOZE_CARD: UpdatedCard = {
    ...EXISTING_CARD,
    front: 'Thủ đô Pháp là [[Paris]]',
    back: '',
  };

  it('chỉ gửi front bỏ hết đoạn đục lỗ trên thẻ trống mặt sau trả ERR_EMPTY_BACK', async () => {
    const cards = fakeRepository(CLOZE_CARD);

    await expect(
      updateCard({ cards }, { userId: USER_ID, cardId: CARD_ID, front: 'Thủ đô Pháp là Paris' }),
    ).rejects.toThrow(new AppError('ERR_EMPTY_BACK'));

    expect(cards.inputs).toHaveLength(0);
  });

  it('chỉ gửi front vẫn còn đục lỗ thì hợp lệ, không ghi đè back', async () => {
    const cards = fakeRepository(CLOZE_CARD);

    await updateCard(
      { cards },
      { userId: USER_ID, cardId: CARD_ID, front: '[[Paris]] là thủ đô Pháp' },
    );

    expect(cards.inputs[0]?.content).toEqual({ front: '[[Paris]] là thủ đô Pháp' });
  });

  it('chỉ gửi back rỗng: thẻ đục lỗ nhận, thẻ thường trả ERR_EMPTY_BACK', async () => {
    const clozeCards = fakeRepository(CLOZE_CARD);
    await updateCard({ cards: clozeCards }, { userId: USER_ID, cardId: CARD_ID, back: '  ' });
    expect(clozeCards.inputs[0]?.content).toEqual({ back: '' });

    const plainCards = fakeRepository(EXISTING_CARD);
    await expect(
      updateCard({ cards: plainCards }, { userId: USER_ID, cardId: CARD_ID, back: '  ' }),
    ).rejects.toThrow(new AppError('ERR_EMPTY_BACK'));
    expect(plainCards.inputs).toHaveLength(0);
  });

  it('gửi đủ hai mặt thì kiểm trên chính request, không cần thẻ hiện tại', async () => {
    const cards = fakeRepository(EXISTING_CARD);

    await updateCard(
      { cards },
      { userId: USER_ID, cardId: CARD_ID, front: 'Pháp: [[Paris]]', back: '' },
    );

    expect(cards.inputs[0]?.content).toEqual({ front: 'Pháp: [[Paris]]', back: '' });
  });

  it('sửa một mặt trên thẻ không thuộc user trả ERR_CARD_NOT_FOUND', async () => {
    const cards = fakeRepository(null);

    await expect(
      updateCard({ cards }, { userId: USER_ID, cardId: CARD_ID, back: 'Đáp mới' }),
    ).rejects.toThrow(new AppError('ERR_CARD_NOT_FOUND'));

    expect(cards.inputs).toHaveLength(0);
  });
});
