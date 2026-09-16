import { AppError } from '../../../shared/errors';
import { makeCardBack, makeCardFront, type CardContent } from '../domain/card';

export type UpdatedCard = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  createdAt: Date;
};

export type CardUpdateRepository = {
  updateOwned(input: {
    userId: string;
    cardId: string;
    content: Partial<CardContent>;
  }): Promise<UpdatedCard | null>;
};

export async function updateCard(
  deps: { cards: CardUpdateRepository },
  input: {
    userId: string;
    cardId: string;
    front?: string;
    back?: string;
  },
): Promise<UpdatedCard> {
  const content: Partial<CardContent> = {};

  if (input.front !== undefined) {
    content.front = makeCardFront(input.front);
  }

  if (input.back !== undefined) {
    content.back = makeCardBack(input.back);
  }

  if (content.front === undefined && content.back === undefined) {
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
