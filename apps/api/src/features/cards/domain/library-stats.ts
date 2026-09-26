import { endOfToday, startOfToday } from '../../review/domain/due-window';
import { retrievability, type Schedule } from '../../review/domain/review-scheduler';

/**
 * Ngưỡng "đã thuộc": độ ổn định trên 30 ngày. Trùng ngưỡng "Vùng bền vững" của
 * màn Thống kê (E10) để cả ứng dụng chỉ có một định nghĩa.
 */
export const MASTERED_STABILITY_DAYS = 30;

/** Ô số liệu Thư viện (SPEC-016), tính trên toàn bộ thẻ của User. */
export type LibraryStats = {
  totalCards: number;
  /** Đến hạn tới hết hôm nay, kể cả thẻ mới — trùng `dueCount` của hàng đợi ôn. */
  dueToday: number;
  /** Thẻ đã học có hạn trước hôm nay; là một phần của `dueToday`. */
  overdue: number;
  reviewedCards: number;
  /** R và S trung bình trên thẻ đã ôn; `null` khi chưa ôn thẻ nào. */
  averageRetrievability: number | null;
  averageStability: number | null;
  masteredCards: number;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Thẻ chưa ôn lần nào có R = 0 và S = 0: tính vào trung bình sẽ kéo số xuống
 * mà không nói gì về trí nhớ, nên chỉ lấy thẻ đã có `lastReviewedAt`.
 */
export function summarizeLibrary(schedules: Schedule[], now: Date): LibraryStats {
  const dueCutoff = endOfToday(now);
  const overdueCutoff = startOfToday(now);
  const reviewed = schedules.filter((schedule) => schedule.lastReviewedAt !== null);

  return {
    totalCards: schedules.length,
    dueToday: schedules.filter((schedule) => schedule.dueDate <= dueCutoff).length,
    overdue: reviewed.filter((schedule) => schedule.dueDate < overdueCutoff).length,
    reviewedCards: reviewed.length,
    averageRetrievability: average(reviewed.map((schedule) => retrievability(schedule, now))),
    averageStability: average(reviewed.map((schedule) => schedule.stability)),
    masteredCards: reviewed.filter((schedule) => schedule.stability > MASTERED_STABILITY_DAYS)
      .length,
  };
}
