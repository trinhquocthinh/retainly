import { calculateCurrentStreak } from '../domain/streak';

export type StreakQuery = {
  findReviewDaysBy(userId: string): Promise<string[]>;
};

export async function getCurrentStreak(
  deps: { streaks: StreakQuery; now: () => Date },
  input: { userId: string },
): Promise<{ currentStreak: number }> {
  const reviewDays = await deps.streaks.findReviewDaysBy(input.userId);

  return { currentStreak: calculateCurrentStreak(reviewDays, deps.now()) };
}
