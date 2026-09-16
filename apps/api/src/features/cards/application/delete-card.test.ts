import { describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/errors';
import { deleteCard, type CardDeleteRepository } from './delete-card';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const CARD_ID = '00000000-0000-0000-0000-0000000000c1';

type DeleteInput = Parameters<CardDeleteRepository['deleteOwned']>[0];

function fakeRepository(result: boolean): CardDeleteRepository & {
  inputs: DeleteInput[];
} {
  const inputs: DeleteInput[] = [];

  return {
    inputs,
    async deleteOwned(input) {
      inputs.push(input);
      return result;
    },
  };
}

describe('E3-S1-T2 — deleteCard', () => {
  it('xóa card thuộc user trả deleted true', async () => {
    const cards = fakeRepository(true);

    await expect(
      deleteCard(
        { cards },
        {
          userId: USER_ID,
          cardId: CARD_ID,
        },
      ),
    ).resolves.toEqual({ deleted: true });

    expect(cards.inputs).toEqual([
      {
        userId: USER_ID,
        cardId: CARD_ID,
      },
    ]);
  });

  it('TC-029: card không thuộc user trả ERR_CARD_NOT_FOUND', async () => {
    const cards = fakeRepository(false);

    await expect(
      deleteCard(
        { cards },
        {
          userId: USER_ID,
          cardId: CARD_ID,
        },
      ),
    ).rejects.toThrow(new AppError('ERR_CARD_NOT_FOUND'));
  });
});
