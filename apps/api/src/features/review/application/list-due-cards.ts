import { describeMemory, type CardMemory } from '../domain/card-memory';
import { endOfToday } from '../domain/due-window';
import type { Schedule } from '../domain/review-scheduler';

/** Phần nội dung của thẻ trong hàng đợi ôn. */
export type QueueCard = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  dueDate: Date;
};

/** Thẻ kèm lịch FSRS, đủ để tính R và chỉ số trí nhớ. */
export type ScheduledCard = { card: QueueCard; schedule: Schedule };

/** DTO hàng đợi (SPEC-003, SPEC-014): lộ chỉ số dẫn xuất, không lộ cột lịch thô. */
export type DueCard = QueueCard & { memory: CardMemory };

/** Cổng đọc hàng đợi ôn. Hiện thực thật nằm ở tầng infrastructure. */
export type DueCardQuery = {
  findDueBy(userId: string, cutoff: Date): Promise<ScheduledCard[]>;
  /**
   * Thẻ đã ôn ít nhất một lần, hạn sau `dueAfter`, không có outcome nào từ
   * `notReviewedSince` trở đi (BR-026); sắp theo hạn rồi id tăng dần.
   */
  findExtraCandidates(
    userId: string,
    window: { dueAfter: Date; notReviewedSince: Date },
  ): Promise<ScheduledCard[]>;
};

export function toDueCard({ card, schedule }: ScheduledCard, now: Date): DueCard {
  return { ...card, memory: describeMemory(schedule, now) };
}

export async function listDueCards(
  deps: { schedules: DueCardQuery; now: () => Date },
  input: { userId: string },
): Promise<{ dueCards: DueCard[]; dueCount: number }> {
  const now = deps.now();
  const rows = await deps.schedules.findDueBy(input.userId, endOfToday(now));
  const dueCards = rows.map((row) => toDueCard(row, now));

  return { dueCards, dueCount: dueCards.length };
}
