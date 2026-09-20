import type { TopicRepository } from './create-topic';

export async function listTopics(deps: { topics: TopicRepository }, userId: string) {
  return { topics: await deps.topics.listByUser(userId) };
}
