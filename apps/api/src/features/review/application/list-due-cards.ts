import { endOfToday } from '../domain/due-window';
import type { Schedule } from '../domain/review-scheduler';

export type DueCard = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  dueDate: Date;
};

/** Ứng viên Ôn thêm: thẻ kèm lịch FSRS để tính R. */
export type ExtraCandidate = { card: DueCard; schedule: Schedule };

/** Cổng đọc hàng đợi ôn. Hiện thực thật nằm ở tầng infrastructure. */
export type DueCardQuery = {
  findDueBy(userId: string, cutoff: Date): Promise<DueCard[]>;
  /**
   * Thẻ đã ôn ít nhất một lần, hạn sau `dueAfter`, không có outcome nào từ
   * `notReviewedSince` trở đi (BR-026); sắp theo hạn rồi id tăng dần.
   */
  findExtraCandidates(
    userId: string,
    window: { dueAfter: Date; notReviewedSince: Date },
  ): Promise<ExtraCandidate[]>;
};

export async function listDueCards(
  deps: { schedules: DueCardQuery; now: () => Date },
  input: { userId: string },
): Promise<{ dueCards: DueCard[]; dueCount: number }> {
  const dueCards = await deps.schedules.findDueBy(input.userId, endOfToday(deps.now()));

  return { dueCards, dueCount: dueCards.length };
}
