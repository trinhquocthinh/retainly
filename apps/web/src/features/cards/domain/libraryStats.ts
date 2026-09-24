/** Ô số liệu Thư viện (SPEC-016), tính trên toàn bộ thẻ, không theo bộ lọc. */
export type LibraryStats = {
  totalCards: number;
  /** Đến hạn tới hết hôm nay, kể cả thẻ mới. */
  dueToday: number;
  /** Thẻ đã học có hạn trước hôm nay; nằm trong `dueToday`. */
  overdue: number;
  reviewedCards: number;
  /** Trung bình trên thẻ đã ôn; `null` khi chưa ôn thẻ nào. */
  averageRetrievability: number | null;
  averageStability: number | null;
  masteredCards: number;
};

/** Khớp `MASTERED_STABILITY_DAYS` của API — chỉ dùng để giải thích trên giao diện. */
export const MASTERED_STABILITY_DAYS = 30;
