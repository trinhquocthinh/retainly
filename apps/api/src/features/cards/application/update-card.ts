import { AppError } from '../../../shared/errors';
import { makeCardBack, makeCardFront, makeCardNote, type CardContent } from '../domain/card';

export type UpdatedCard = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  note: string | null;
  createdAt: Date;
};

/** Trường nào có mặt thì ghi đè; `note: null` là xoá ghi chú. */
type CardEdit = Partial<CardContent> & { note?: string | null };

export type CardUpdateRepository = {
  updateOwned(input: {
    userId: string;
    cardId: string;
    content: CardEdit;
  }): Promise<UpdatedCard | null>;
};

export async function updateCard(
  deps: { cards: CardUpdateRepository },
  input: {
    userId: string;
    cardId: string;
    front?: string;
    back?: string;
    note?: string | null;
  },
): Promise<UpdatedCard> {
  const content: CardEdit = {};

  if (input.front !== undefined) {
    content.front = makeCardFront(input.front);
  }

  if (input.back !== undefined) {
    content.back = makeCardBack(input.back);
  }

  // undefined là "không gửi" nên không đụng tới; null hay chuỗi trắng là xoá.
  if (input.note !== undefined) {
    content.note = makeCardNote(input.note);
  }

  if (Object.keys(content).length === 0) {
    throw new AppError('ERR_BAD_REQUEST');
  }

  const updated = await deps.cards.updateOwned({
    userId: input.userId,
    cardId: input.cardId,
    content,
  });

  if (updated === null) throw new AppError('ERR_CARD_NOT_FOUND');

  return updated;
}
