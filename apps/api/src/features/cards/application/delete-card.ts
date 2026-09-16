import { AppError } from '../../../shared/errors';

export type CardDeleteRepository = {
  deleteOwned(input: { userId: string; cardId: string }): Promise<boolean>;
};

export async function deleteCard(
  deps: { cards: CardDeleteRepository },
  input: { userId: string; cardId: string },
): Promise<{ deleted: true }> {
  const deleted = await deps.cards.deleteOwned(input);

  if (!deleted) throw new AppError('ERR_CARD_NOT_FOUND');

  return { deleted: true };
}
