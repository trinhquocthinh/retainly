import { AppError } from '../../../shared/errors';

export type Topic = {
  id: string;
  name: string;
  createdAt: Date;
};

export type TopicRepository = {
  create(input: { userId: string; name: string }): Promise<Topic | null>;
  listByUser(userId: string): Promise<Topic[]>;
  belongsToUser(input: { userId: string; topicId: string }): Promise<boolean>;
};

export async function createTopic(
  deps: { topics: TopicRepository },
  input: { userId: string; name: string },
): Promise<Topic> {
  const name = input.name.trim();
  if (name.length === 0) throw new AppError('ERR_BAD_REQUEST');

  const topic = await deps.topics.create({ userId: input.userId, name });
  if (topic === null) throw new AppError('ERR_TOPIC_NAME_TAKEN');

  return topic;
}
