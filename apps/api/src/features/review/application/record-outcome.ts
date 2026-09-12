import { AppError } from '../../../shared/errors';
import { applyOutcome, type ReviewOutcome, type Schedule } from '../domain/review-scheduler';

type SavedOutcome = {
  cardId: string;
  outcome: ReviewOutcome;
  reviewedAt: Date;
  schedule: Schedule;
};

/** Cổng đọc/ghi lịch ôn. Hiện thực thật nằm ở tầng infrastructure. */
export type ReviewRepository = {
  findScheduleFor(userId: string, cardId: string): Promise<Schedule | null>;
  save(input: SavedOutcome): Promise<void>;
};

export async function recordOutcome(
  deps: { reviews: ReviewRepository; now: () => Date },
  input: { userId: string; cardId: string; outcome: ReviewOutcome },
): Promise<{ updatedSchedule: Schedule }> {
  const current = await deps.reviews.findScheduleFor(input.userId, input.cardId);
  if (current === null) throw new AppError('ERR_CARD_NOT_FOUND');

  const reviewedAt = deps.now();
  const schedule = applyOutcome(current, input.outcome, reviewedAt);

  await deps.reviews.save({ cardId: input.cardId, outcome: input.outcome, reviewedAt, schedule });

  return { updatedSchedule: schedule };
}
