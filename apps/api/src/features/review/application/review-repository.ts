import type { ReviewOutcome, Schedule } from '../domain/review-scheduler';

export type RecordedOutcome = {
  id: string;
  cardId: string;
  reviewedAt: Date;
  /** Null ở outcome ghi trước E8-S1-T1 — không hoàn tác được. */
  previousSchedule: Schedule | null;
};

/**
 * Các thao tác chạy bên trong một transaction. Sau `lockSchedule`, mọi ghi/hoàn
 * tác khác trên cùng thẻ phải xếp hàng tới khi transaction này kết thúc.
 */
export type ReviewStore = {
  /** Khoá lịch ôn của thẻ thuộc `userId`; null khi thẻ không tồn tại hoặc của người khác. */
  lockSchedule(userId: string, cardId: string): Promise<Schedule | null>;
  findOutcome(userId: string, outcomeId: string): Promise<RecordedOutcome | null>;
  latestOutcomeId(cardId: string): Promise<string | null>;
  /** Ghi lịch mới và chèn outcome kèm ảnh chụp lịch cũ; trả id outcome. */
  saveOutcome(input: {
    cardId: string;
    outcome: ReviewOutcome;
    reviewedAt: Date;
    schedule: Schedule;
    previousSchedule: Schedule;
  }): Promise<string>;
  /** Xoá outcome và ghi lại lịch về `schedule`. */
  undoOutcome(input: { outcomeId: string; cardId: string; schedule: Schedule }): Promise<void>;
};

/** Cổng đọc/ghi lịch ôn. Hiện thực thật nằm ở tầng infrastructure. */
export type ReviewRepository = {
  inTransaction<T>(work: (store: ReviewStore) => Promise<T>): Promise<T>;
};
