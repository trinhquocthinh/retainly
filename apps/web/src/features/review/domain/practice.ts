import type { DueCard, ReviewOutcome } from './review';

export type PracticeSize = 10 | 15;
export type PracticeSession = {
  id: string;
  size: number;
  canUndo: boolean;
  topicId: string | null;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  closedAt: string | null;
  items: {
    id: string;
    card: DueCard | null;
    answer: { id: string | null; outcome: ReviewOutcome; reviewedAt: string } | null;
  }[];
};

export type PracticeOverview = {
  activeSessionId: string | null;
  completedToday: number;
  availableCount: number;
};

export type PracticeResponse = { session: PracticeSession | null };
