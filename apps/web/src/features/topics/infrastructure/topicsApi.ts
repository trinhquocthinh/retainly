import { api } from '@src/shared/api/client';

import type { Topic, TopicsResponse } from '../domain/topic';

export function fetchTopics(): Promise<TopicsResponse> {
  return api.get<TopicsResponse>('/topics');
}

export function createTopic(name: string): Promise<Topic> {
  return api.post<Topic>('/topics', { name });
}
