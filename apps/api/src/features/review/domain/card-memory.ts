import {
  applyOutcome,
  retrievability,
  type ReviewOutcome,
  type Schedule,
} from './review-scheduler';

/**
 * Chỉ số trí nhớ của một thẻ tại lúc nạp hàng đợi (US-016). Server tính sẵn để
 * trọng số FSRS và đường cong quên chỉ nằm ở review-scheduler, web không phải
 * cài lại ts-fsrs.
 */
export type CardMemory = {
  stability: number;
  difficulty: number;
  retrievability: number;
  lastReviewedAt: Date | null;
  /** Khoảng cách tới lần ôn kế tiếp (ngày) nếu chấm Nhớ / Quên ngay lúc này. */
  forecastDays: Record<ReviewOutcome, number>;
};

export function describeMemory(schedule: Schedule, now: Date): CardMemory {
  return {
    stability: schedule.stability,
    difficulty: schedule.difficulty,
    retrievability: retrievability(schedule, now),
    lastReviewedAt: schedule.lastReviewedAt,
    // Chạy thử đúng phép tính của lượt ghi thật, nên dự báo không thể lệch với
    // lịch mà POST /api/review-outcomes sẽ lưu.
    forecastDays: {
      remembered: applyOutcome(schedule, 'remembered', now).intervalDays,
      forgotten: applyOutcome(schedule, 'forgotten', now).intervalDays,
    },
  };
}
