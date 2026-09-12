import { makeCardContent } from '../domain/card';
import { createInitialSchedule, type Schedule } from '../../review/domain/review-scheduler';

type NewCard = { userId: string; front: string; back: string; schedule: Schedule };
export type CreatedCard = NewCard & { id: string; createdAt: Date };

/** Cổng lưu trữ thẻ. Hiện thực thật nằm ở tầng infrastructure. */
export type CardRepository = {
  create(card: NewCard): Promise<CreatedCard>;
};

export async function createCard(
  deps: { cards: CardRepository; now: () => Date },
  input: { userId: string; front: string; back: string },
): Promise<CreatedCard> {
  const content = makeCardContent(input);

  return deps.cards.create({
    userId: input.userId,
    ...content,
    schedule: createInitialSchedule(deps.now()),
  });
}
