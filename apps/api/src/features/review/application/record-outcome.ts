import { AppError } from '../../../shared/errors';
import { applyOutcome, type ReviewOutcome, type Schedule } from '../domain/review-scheduler';
import type { ReviewRepository } from './review-repository';

export async function recordOutcome(
  deps: { reviews: ReviewRepository; now: () => Date },
  input: { userId: string; cardId: string; outcome: ReviewOutcome },
): Promise<{ outcomeId: string; updatedSchedule: Schedule }> {
  return deps.reviews.inTransaction(async (store) => {
    // Khoá trước khi đọc: hai lượt song song trên cùng thẻ không được cùng tính
    // từ một lịch cũ rồi ghi đè lên nhau.
    const current = await store.lockSchedule(input.userId, input.cardId);
    if (current === null) throw new AppError('ERR_CARD_NOT_FOUND');

    const reviewedAt = deps.now();
    const schedule = applyOutcome(current, input.outcome, reviewedAt);

    const outcomeId = await store.saveOutcome({
      cardId: input.cardId,
      outcome: input.outcome,
      reviewedAt,
      schedule,
      previousSchedule: current,
    });

    return { outcomeId, updatedSchedule: schedule };
  });
}
