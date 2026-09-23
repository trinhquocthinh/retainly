/** BR-024: chỉ hoàn tác được trong 10 phút kể từ lúc ghi nhận kết quả. */
const UNDO_WINDOW_MS = 10 * 60_000;

/** Đúng mốc 10 phút vẫn còn trong cửa sổ. */
export function isWithinUndoWindow(reviewedAt: Date, now: Date): boolean {
  return now.getTime() - reviewedAt.getTime() <= UNDO_WINDOW_MS;
}
