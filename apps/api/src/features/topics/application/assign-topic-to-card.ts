import { AppError } from '../../../shared/errors';
import type { TopicRepository } from './create-topic';

export type AssignedCard = {
  id: string;
  sourceId: string | null;
  topicId: string | null;
  front: string;
  back: string;
  createdAt: Date;
};

export type CardTopicRepository = {
  assignOwned(input: {
    userId: string;
    cardId: string;
    topicId: string | null;
  }): Promise<AssignedCard | null>;
};

export async function assignTopicToCard(
  deps: { topics: TopicRepository; cards: CardTopicRepository },
  input: { userId: string; cardId: string; topicId: string | null },
): Promise<AssignedCard> {
  if (input.topicId !== null) {
    const owned = await deps.topics.belongsToUser({
      userId: input.userId,
      topicId: input.topicId,
    });
    if (!owned) throw new AppError('ERR_TOPIC_NOT_FOUND');
  }

  const card = await deps.cards.assignOwned(input);
  if (card === null) throw new AppError('ERR_CARD_NOT_FOUND');

  return card;
}
