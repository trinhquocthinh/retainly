import { MASTERED_STABILITY_DAYS } from '../../cards/domain/library-stats';
import { endOfToday } from '../domain/due-window';
import { DESIRED_RETENTION } from '../domain/review-scheduler';
import {
  describePeriod,
  rangeStart,
  ratio,
  weekActivity,
  weekStart,
  type Consistency,
  type StatsPeriod,
  type StatsRange,
  type WeekActivityDay,
} from '../domain/stats';
import { calculateCurrentStreak, calculateLongestStreak } from '../domain/streak';
import type { StreakQuery } from './get-current-streak';

type OutcomeCounts = { remembered: number; total: number };

type DurableCounts = { cards: number; totalCards: number };

/** Một Topic có lượt ôn trong khoảng. `averageDifficulty` và `dueCount` là số liệu hiện tại. */
export type TopicStatsRow = {
  topic: { id: string; name: string };
  reviews: number;
  forgotten: number;
  forgetRate: number;
  /** D trung bình của thẻ đã ôn (thẻ mới có D = 0 nên bỏ qua); `null` khi không có thẻ nào. */
  averageDifficulty: number | null;
  dueCount: number;
};

/** Cổng đọc số liệu màn Thống kê. `since = null` là không chặn dưới. */
export type StatsQuery = {
  countOutcomes(userId: string, since: Date | null): Promise<OutcomeCounts>;
  /** Số lượt ôn theo ngày giờ Việt Nam, từ `since`; ngày không có lượt nào không có dòng. */
  countReviewsByDay(userId: string, since: Date): Promise<WeekActivityDay[]>;
  /** Thẻ đã ôn có S vượt `stabilityAbove`, trên tổng số thẻ. */
  countDurable(userId: string, stabilityAbove: number): Promise<DurableCounts>;
  /** Topic có lượt ôn từ `since`, tỷ lệ quên cao trước (BR-019). */
  summarizeTopics(
    userId: string,
    window: { since: Date | null; dueBy: Date },
  ): Promise<TopicStatsRow[]>;
};

export type Stats = {
  range: StatsRange;
  period: StatsPeriod;
  consistency: Consistency;
  streak: { current: number; longest: number };
  durable: DurableCounts & { share: number | null };
  recall: OutcomeCounts & { rate: number | null; target: number };
  topics: (TopicStatsRow & { reviewShare: number })[];
  week: WeekActivityDay[];
};

/** SPEC-018: số liệu màn Thống kê theo khoảng 30 ngày hoặc toàn bộ. */
export async function getStats(
  deps: { stats: StatsQuery; streaks: StreakQuery; now: () => Date },
  input: { userId: string; range: StatsRange },
): Promise<Stats> {
  const now = deps.now();
  const since = rangeStart(input.range, now);
  const { stats } = deps;

  const [reviewDays, outcomes, durable, topics, weekCounts] = await Promise.all([
    deps.streaks.findReviewDaysBy(input.userId),
    stats.countOutcomes(input.userId, since),
    stats.countDurable(input.userId, MASTERED_STABILITY_DAYS),
    stats.summarizeTopics(input.userId, { since, dueBy: endOfToday(now) }),
    stats.countReviewsByDay(input.userId, weekStart(now)),
  ]);

  const topicReviews = topics.reduce((sum, row) => sum + row.reviews, 0);

  return {
    range: input.range,
    ...describePeriod(input.range, reviewDays, now),
    streak: {
      current: calculateCurrentStreak(reviewDays, now),
      longest: calculateLongestStreak(reviewDays, now),
    },
    durable: { ...durable, share: ratio(durable.cards, durable.totalCards) },
    recall: {
      ...outcomes,
      rate: ratio(outcomes.remembered, outcomes.total),
      target: DESIRED_RETENTION,
    },
    // Topic chỉ có mặt khi có lượt ôn, nên tổng luôn dương.
    topics: topics.map((row) => ({ ...row, reviewShare: row.reviews / topicReviews })),
    week: weekActivity(weekCounts, now),
  };
}
