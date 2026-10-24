import { api } from '@src/shared/api/client';
import type { PracticeOverview, PracticeResponse, PracticeSize } from '../domain/practice';
import type { ReviewOutcome } from '../domain/review';

export function beginPractice(input: {
  size: PracticeSize;
  topicId?: string;
}): Promise<PracticeResponse> {
  return api.post('/practice-sessions', input);
}
export function loadPractice(id: string): Promise<PracticeResponse> {
  return api.get(`/practice-sessions/${encodeURIComponent(id)}`);
}
export function ratePractice(
  id: string,
  input: { itemId: string; outcome: ReviewOutcome },
): Promise<PracticeResponse> {
  return api.post(`/practice-sessions/${encodeURIComponent(id)}/outcomes`, input);
}
export function undoPractice(
  id: string,
  input: { itemId: string; outcomeId: string },
): Promise<PracticeResponse> {
  return api.post(`/practice-sessions/${encodeURIComponent(id)}/undo`, input);
}
export function fetchPracticeOverview(): Promise<PracticeOverview> {
  return api.get('/practice-sessions/overview');
}
