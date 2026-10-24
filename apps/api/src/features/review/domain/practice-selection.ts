import { endOfToday, startOfToday } from './due-window';
import { retrievability, type Schedule } from './review-scheduler';

export type PracticeSize = 10 | 15;
export type PracticeCandidate = {
  id: string;
  topicId: string | null;
  sourceId: string | null;
  createdAt: Date;
  schedule: Schedule;
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Ưu tiên giảm thẻ cùng nguồn/chủ đề/đợt tạo đứng cạnh nhau, khi có lựa chọn. */
function spread<T extends PracticeCandidate>(items: readonly T[], limit = items.length): T[] {
  const remaining = [...items];
  const result: T[] = [];
  while (remaining.length > 0 && result.length < limit) {
    const group = (card: T) => card.sourceId ?? card.topicId ?? 'unclassified';
    const counts = new Map<string, number>();
    for (const card of remaining) counts.set(group(card), (counts.get(group(card)) ?? 0) + 1);
    const previous = result[result.length - 1];
    const penalty = (card: T) =>
      previous === undefined
        ? 0
        : Number(card.sourceId !== null && card.sourceId === previous.sourceId) * 4 +
          Number(card.topicId !== null && card.topicId === previous.topicId) * 2 +
          Number(
            startOfToday(card.createdAt).getTime() === startOfToday(previous.createdAt).getTime(),
          );
    let best = 0;
    for (let i = 1; i < remaining.length; i++) {
      const difference = penalty(remaining[i]) - penalty(remaining[best]);
      if (
        difference < 0 ||
        (difference === 0 && counts.get(group(remaining[i]))! > counts.get(group(remaining[best]))!)
      )
        best = i;
    }
    result.push(remaining.splice(best, 1)[0]);
  }
  return result;
}

/** Chỉ gọi khi tạo bài mới; danh sách kết quả phải được lưu nguyên thứ tự. */
export function selectPracticeCards<T extends PracticeCandidate>(
  candidates: readonly T[],
  now: Date,
  size: PracticeSize,
  random: () => number = Math.random,
): T[] {
  const unique = [...new Map(candidates.map((card) => [card.id, card])).values()];
  const fresh = spread(
    shuffle(
      unique.filter((c) => c.schedule.lastReviewedAt === null),
      random,
    ),
    size,
  );
  const cutoff = endOfToday(now).getTime();
  const reviewed = shuffle(
    unique.filter((c) => c.schedule.lastReviewedAt !== null),
    random,
  );
  // Các thẻ cùng ngày hạn có thể trộn; không để random đẩy thẻ quá hạn sau ôn sớm.
  const urgency = (card: T) =>
    card.schedule.dueDate.getTime() <= cutoff
      ? startOfToday(card.schedule.dueDate).getTime()
      : Infinity;
  reviewed.sort((a, b) => {
    const aDue = urgency(a);
    const bDue = urgency(b);
    if (aDue !== bDue) return aDue < bDue ? -1 : 1;
    if (aDue !== Infinity) return 0;
    return retrievability(a.schedule, now) - retrievability(b.schedule, now);
  });

  const oldTarget = Math.round((size * 2) / 3);
  const selected = [...reviewed.slice(0, oldTarget), ...fresh.slice(0, size - oldTarget)];
  const used = new Set(selected.map((card) => card.id));
  // Thiếu một nhóm thì bù nhóm còn lại, vẫn chỉ tối đa size thẻ khác nhau.
  for (const card of [...reviewed, ...fresh]) {
    if (selected.length >= size) break;
    if (!used.has(card.id)) {
      selected.push(card);
      used.add(card.id);
    }
  }
  return spread(shuffle(selected, random));
}
