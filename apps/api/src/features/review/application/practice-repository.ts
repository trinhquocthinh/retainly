import type { ReviewOutcome } from '../domain/review-scheduler';
import type { PracticeCandidate, PracticeSize } from '../domain/practice-selection';
import type { ScheduledCard } from './list-due-cards';
import type { ReviewStore } from './review-repository';

export type PracticeStatus = 'active' | 'completed' | 'abandoned';
export type PracticeAnswer = { id: string | null; outcome: ReviewOutcome; reviewedAt: Date };
export type PracticeRecord = {
  id: string;
  size: number;
  undoUsed: boolean;
  topicId: string | null;
  status: PracticeStatus;
  createdAt: Date;
  closedAt: Date | null;
  items: { id: string; card: ScheduledCard | null; answer: PracticeAnswer | null }[];
};

export type PracticeStore = {
  reviews: ReviewStore;
  findActive(userId: string): Promise<PracticeRecord | null>;
  findSession(userId: string, id: string): Promise<PracticeRecord | null>;
  findCandidates(userId: string, now: Date, topicId?: string): Promise<PracticeCandidate[]>;
  createSession(input: {
    userId: string;
    size: PracticeSize;
    topicId?: string;
    cardIds: string[];
    now: Date;
  }): Promise<PracticeRecord>;
  linkAnswer(itemId: string, outcomeId: string): Promise<void>;
  unlinkAnswer(itemId: string): Promise<void>;
  markUndoUsed(id: string): Promise<void>;
  setStatus(id: string, status: PracticeStatus, closedAt: Date | null): Promise<void>;
};

export type PracticeOverview = {
  activeSessionId: string | null;
  completedToday: number;
  availableCount: number;
};

export type PracticeRepository = {
  /** Serial hoá các thao tác của cùng user, bao gồm tạo bài và Undo. */
  inTransaction<T>(userId: string, work: (store: PracticeStore) => Promise<T>): Promise<T>;
  overview(userId: string, now: Date): Promise<PracticeOverview>;
};
