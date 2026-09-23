import { endOfToday, startOfToday } from '../domain/due-window';
import { pickExtraReview } from '../domain/extra-review';
import { toDueCard, type DueCard, type DueCardQuery } from './list-due-cards';

/** Ôn thêm (BR-026): tối đa 5 thẻ chưa đến hạn, chưa ôn hôm nay, R thấp nhất. */
export async function listExtraCards(
  deps: { schedules: DueCardQuery; now: () => Date },
  input: { userId: string },
): Promise<{ extraCards: DueCard[] }> {
  const now = deps.now();
  const candidates = await deps.schedules.findExtraCandidates(input.userId, {
    dueAfter: endOfToday(now),
    notReviewedSince: startOfToday(now),
  });

  return { extraCards: pickExtraReview(candidates, now).map((row) => toDueCard(row, now)) };
}
