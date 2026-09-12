import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs';

export type ReviewOutcome = 'remembered' | 'forgotten';
export type ScheduleState = 'new' | 'learning' | 'review' | 'relearning';

export type Schedule = {
  /**
   * Trạng thái vòng đời FSRS.
   * Miền giá trị thực tế ở v0.1: 'new' | 'review'. 'learning' và 'relearning'
   * chỉ phát sinh khi enable_short_term = true (tech-spec §3: tắt).
   */
  state: ScheduleState;

  /**
   * Thời điểm đến hạn kế tiếp.
   * Khóa lọc của SPEC-003; ánh xạ tới review_schedules.due_date (timestamptz, có index).
   */
  dueDate: Date;

  /**
   * Khoảng cách tới lần ôn kế tiếp, đơn vị ngày.
   * Bất biến: intervalDays === scheduledDays.
   * Tồn tại song song vì là đại lượng nghiệp vụ của BR-004/BR-005 và là giá trị
   * TC-011/TC-012 kiểm chứng.
   */
  intervalDays: number;

  /**
   * Độ bền trí nhớ, đơn vị ngày.
   * Định nghĩa: khoảng thời gian để xác suất nhớ lại giảm còn 0,9 (request_retention).
   * Biến đầu vào chính của phép tính dueDate; không bảo toàn giá trị này thì
   * thuật toán suy biến về trạng thái thẻ mới.
   */
  stability: number;

  /**
   * Độ khó nội tại của thẻ. Miền [1, 10], 1 = dễ nhất.
   * Hệ số điều tiết tốc độ tăng của stability qua mỗi lượt ôn.
   */
  difficulty: number;

  /**
   * Số ngày trôi qua giữa lượt ôn trước và lượt hiện tại.
   * Chênh lệch so với scheduledDays (ôn sớm hoặc trễ hạn) là đầu vào hiệu chỉnh của FSRS.
   */
  elapsedDays: number;

  /**
   * Khoảng cách đã hẹn ở lượt trước, đơn vị ngày.
   * Bắt buộc bảo toàn nguyên vẹn giữa hai lượt ôn.
   */
  scheduledDays: number;

  /** Tổng số lượt ôn tích lũy, tính cả lượt có outcome = 'forgotten'. */
  reps: number;

  /**
   * Số lượt outcome = 'forgotten' tích lũy; tăng 1 mỗi lượt quên.
   * Giá trị tổng hợp sẵn, thay cho phép quét bảng review_outcomes.
   */
  lapses: number;

  /** Thời điểm ôn gần nhất; null khi reps = 0. */
  lastReviewedAt: Date | null;
};

// FSRS-6, khớp mặc định của ts-fsrs 5.4.2. Ghim tường minh: nâng thư viện
// không được phép âm thầm đổi lịch ôn của thẻ đang có. Xem tech-spec §3.
const FSRS_WEIGHTS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
  0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

const scheduler = fsrs(generatorParameters({ w: FSRS_WEIGHTS, enable_short_term: false }));

const RATING: Record<ReviewOutcome, Rating.Again | Rating.Good> = {
  forgotten: Rating.Again,
  remembered: Rating.Good,
};

const STATE_NAMES = ['new', 'learning', 'review', 'relearning'] as const;

function toCard(schedule: Schedule): Card {
  return {
    due: schedule.dueDate,
    stability: schedule.stability,
    difficulty: schedule.difficulty,
    elapsed_days: schedule.elapsedDays,
    scheduled_days: schedule.scheduledDays,
    learning_steps: 0,
    reps: schedule.reps,
    lapses: schedule.lapses,
    state: STATE_NAMES.indexOf(schedule.state) as State,
    ...(schedule.lastReviewedAt !== null ? { last_review: schedule.lastReviewedAt } : {}),
  };
}

function toSchedule(card: Card): Schedule {
  return {
    state: STATE_NAMES[card.state],
    dueDate: card.due,
    intervalDays: card.scheduled_days,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    lastReviewedAt: card.last_review ?? null,
  };
}

export function createInitialSchedule(now: Date): Schedule {
  return toSchedule(createEmptyCard(now));
}

export function applyOutcome(current: Schedule, outcome: ReviewOutcome, now: Date): Schedule {
  return toSchedule(scheduler.next(toCard(current), now, RATING[outcome]).card);
}
