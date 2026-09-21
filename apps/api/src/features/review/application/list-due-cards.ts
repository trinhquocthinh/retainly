import { endOfToday } from '../domain/due-window';

export type DueCard = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  dueDate: Date;
};

/** Cổng đọc thẻ đến hạn. Hiện thực thật nằm ở tầng infrastructure. */
export type DueCardQuery = {
  findDueBy(userId: string, cutoff: Date): Promise<DueCard[]>;
};

export async function listDueCards(
  deps: { schedules: DueCardQuery; now: () => Date },
  input: { userId: string },
): Promise<{ dueCards: DueCard[]; dueCount: number }> {
  const dueCards = await deps.schedules.findDueBy(input.userId, endOfToday(deps.now()));

  return { dueCards, dueCount: dueCards.length };
}
