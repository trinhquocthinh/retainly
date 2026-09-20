import { api } from '@src/shared/api/client';

import type { ForgetRateResponse } from '../domain/forgetRate';
import type { Topic, TopicsResponse } from '../domain/topic';

export function fetchTopics(): Promise<TopicsResponse> {
  return api.get<TopicsResponse>('/topics');
}

export function fetchTopicForgetRates(): Promise<ForgetRateResponse> {
  return api.get<ForgetRateResponse>('/topics/forget-rate');
}

export function createTopic(name: string): Promise<Topic> {
  return api.post<Topic>('/topics', { name });
}
