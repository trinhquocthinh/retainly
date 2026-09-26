import { retrievability, type Schedule } from './review-scheduler';

/** Số thẻ tối đa mỗi lượt Ôn thêm (BR-026). */
export const EXTRA_REVIEW_LIMIT = 5;

/**
 * Chọn tối đa 5 thẻ có R thấp nhất tại `now` — thẻ sắp quên nhất lên trước.
 * R bằng nhau (ts-fsrs làm tròn xuống số ngày trôi qua nên hay hoà) thì thẻ có
 * hạn sớm hơn lên trước; hoà cả hai thì giữ thứ tự đầu vào vì sort ổn định.
 */
export function pickExtraReview<T extends { schedule: Schedule }>(
  candidates: readonly T[],
  now: Date,
): T[] {
  return candidates
    .map((candidate) => ({ candidate, r: retrievability(candidate.schedule, now) }))
    .sort(
      (left, right) =>
        left.r - right.r ||
        left.candidate.schedule.dueDate.getTime() - right.candidate.schedule.dueDate.getTime(),
    )
    .slice(0, EXTRA_REVIEW_LIMIT)
    .map(({ candidate }) => candidate);
}
