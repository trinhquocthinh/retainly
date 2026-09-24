import { endOfToday, startOfToday } from '../domain/due-window';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  reviewWeek,
  type ReviewWeekDay,
} from '../domain/streak';
import type { StreakQuery } from './get-current-streak';

/** "Cần củng cố gấp": thẻ đã ôn có độ khó FSRS trên ngưỡng này (thang 1–10). */
export const DIFFICULT_CARD_THRESHOLD = 7.5;

/** Số thẻ trong mục "Chu kỳ ôn kế tiếp" của Trang chủ. */
export const UPCOMING_LIMIT = 3;

type TopicRef = { id: string; name: string };

/** Tiến độ hôm nay (B4): đếm theo Card khác nhau, không theo số lượt ôn. */
export type TodayProgress = { reviewed: number; total: number };

type LibraryOverview = {
  totalCards: number;
  /** Số Topic có ít nhất một thẻ. */
  topicCount: number;
  difficultCards: number;
};

type TopicDueCount = { topic: TopicRef | null; count: number };

export type UpcomingCard = {
  id: string;
  front: string;
  back: string;
  topic: TopicRef | null;
  dueDate: Date;
  reps: number;
};

/** Cổng đọc số liệu Trang chủ. Hiện thực thật nằm ở tầng infrastructure. */
export type HomeOverviewQuery = {
  /** Thẻ đã ôn từ `reviewedSince`, trên tập (thẻ đó ∪ thẻ có hạn tới `dueBy`). */
  countTodayProgress(
    userId: string,
    window: { reviewedSince: Date; dueBy: Date },
  ): Promise<TodayProgress>;
  summarizeLibrary(userId: string, difficultAbove: number): Promise<LibraryOverview>;
  /** Thẻ có hạn tới `dueBy` gom theo Topic, nhiều thẻ trước. */
  countDueByTopic(userId: string, dueBy: Date): Promise<TopicDueCount[]>;
  /** Thẻ có hạn sau `dueAfter`, hạn gần nhất trước. */
  findUpcoming(userId: string, window: { dueAfter: Date; limit: number }): Promise<UpcomingCard[]>;
};

export type HomeOverview = {
  todayProgress: TodayProgress;
  streak: { current: number; longest: number; week: ReviewWeekDay[] };
  library: LibraryOverview;
  dueByTopic: TopicDueCount[];
  upcoming: UpcomingCard[];
};

/** SPEC-017: tổng quan Trang chủ và sidebar trong một lần gọi. */
export async function getHomeOverview(
  deps: { overview: HomeOverviewQuery; streaks: StreakQuery; now: () => Date },
  input: { userId: string },
): Promise<HomeOverview> {
  const now = deps.now();
  const dueBy = endOfToday(now);
  const { overview } = deps;

  const [todayProgress, library, dueByTopic, upcoming, reviewDays] = await Promise.all([
    overview.countTodayProgress(input.userId, { reviewedSince: startOfToday(now), dueBy }),
    overview.summarizeLibrary(input.userId, DIFFICULT_CARD_THRESHOLD),
    overview.countDueByTopic(input.userId, dueBy),
    overview.findUpcoming(input.userId, { dueAfter: dueBy, limit: UPCOMING_LIMIT }),
    deps.streaks.findReviewDaysBy(input.userId),
  ]);

  return {
    todayProgress,
    streak: {
      current: calculateCurrentStreak(reviewDays, now),
      longest: calculateLongestStreak(reviewDays, now),
      week: reviewWeek(reviewDays, now),
    },
    library,
    dueByTopic,
    upcoming,
  };
}
