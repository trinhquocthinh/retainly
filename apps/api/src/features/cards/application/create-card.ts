import { makeCardContent } from '../domain/card';
import { createInitialSchedule, type Schedule } from '../../review/domain/review-scheduler';
import { AppError } from '../../../shared/errors';

type NewCard = {
  userId: string;
  sourceId?: string;
  topicId?: string;
  front: string;
  back: string;
  schedule: Schedule;
};

export type CreatedCard = NewCard & {
  id: string;
  createdAt: Date;
};

export type CardRepository = {
  create(card: NewCard): Promise<CreatedCard>;
};

export type SourceOwnership = {
  belongsToUser(input: { userId: string; sourceId: string }): Promise<boolean>;
};

export type TopicOwnership = {
  belongsToUser(input: { userId: string; topicId: string }): Promise<boolean>;
};

export async function createCard(
  deps: {
    cards: CardRepository;
    sources: SourceOwnership;
    topics: TopicOwnership;
    now: () => Date;
  },
  input: {
    userId: string;
    sourceId?: string;
    topicId?: string;
    front: string;
    back: string;
  },
): Promise<CreatedCard> {
  const content = makeCardContent(input);

  if (input.sourceId !== undefined) {
    const owned = await deps.sources.belongsToUser({
      userId: input.userId,
      sourceId: input.sourceId,
    });

    if (!owned) throw new AppError('ERR_SOURCE_NOT_FOUND');
  }

  if (input.topicId !== undefined) {
    const owned = await deps.topics.belongsToUser({
      userId: input.userId,
      topicId: input.topicId,
    });

    if (!owned) throw new AppError('ERR_TOPIC_NOT_FOUND');
  }

  return deps.cards.create({
    userId: input.userId,
    sourceId: input.sourceId,
    topicId: input.topicId,
    ...content,
    schedule: createInitialSchedule(deps.now()),
  });
}
