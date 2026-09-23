import { AppError } from '../../../shared/errors';
import type { Schedule } from '../domain/review-scheduler';
import { isWithinUndoWindow } from '../domain/undo-window';
import type { ReviewRepository } from './review-repository';

/** BR-024: hoàn tác outcome mới nhất của thẻ — khôi phục lịch cũ và xoá hẳn outcome. */
export async function undoOutcome(
  deps: { reviews: ReviewRepository; now: () => Date },
  input: { userId: string; outcomeId: string },
): Promise<{ restoredSchedule: Schedule }> {
  return deps.reviews.inTransaction(async (store) => {
    const target = await store.findOutcome(input.userId, input.outcomeId);
    if (target === null) throw new AppError('ERR_OUTCOME_NOT_FOUND');

    // Hỏi "mới nhất chưa" sau khi đã khoá lịch: một lượt ghi hoặc hoàn tác
    // song song trên cùng thẻ phải xong hẳn trước khi câu trả lời được tin.
    if ((await store.lockSchedule(input.userId, target.cardId)) === null) {
      throw new AppError('ERR_OUTCOME_NOT_FOUND');
    }

    const { previousSchedule } = target;
    const isLatest = (await store.latestOutcomeId(target.cardId)) === target.id;
    if (
      !isLatest ||
      previousSchedule === null ||
      !isWithinUndoWindow(target.reviewedAt, deps.now())
    ) {
      throw new AppError('ERR_UNDO_NOT_ALLOWED');
    }

    await store.undoOutcome({
      outcomeId: target.id,
      cardId: target.cardId,
      schedule: previousSchedule,
    });

    return { restoredSchedule: previousSchedule };
  });
}
