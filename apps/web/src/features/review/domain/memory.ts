/**
 * Chỉ số trí nhớ server tính sẵn lúc nạp hàng đợi (SPEC-003, US-016). Cả phiên
 * không nạp lại nên R là giá trị tại đầu phiên, đủ chính xác cho một lượt ôn.
 */
export type CardMemory = {
  stability: number;
  difficulty: number;
  retrievability: number;
  lastReviewedAt: string | null;
  forecastDays: { remembered: number; forgotten: number };
};

const DAY_MS = 86_400_000;

// en-CA in ngày dạng YYYY-MM-DD, đổi thẳng được sang mốc UTC để trừ nhau.
const CALENDAR_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
const ONE_DECIMAL = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Chưa ôn lần nào thì chưa có trí nhớ để đo — S, D, R đều vô nghĩa. */
export function isNewCard(memory: CardMemory): boolean {
  return memory.lastReviewedAt === null;
}

export function formatMemory(memory: CardMemory) {
  return {
    stability: `${ONE_DECIMAL.format(memory.stability)} ngày`,
    difficulty: ONE_DECIMAL.format(memory.difficulty),
    retrievability: `${Math.round(memory.retrievability * 100)}%`,
  };
}

export function formatForecast(days: number): string {
  return `+${days} ngày`;
}

/** Đếm theo ngày lịch giờ Việt Nam, không theo 24 giờ: ôn lúc 23h thì sáng mai là "hôm qua". */
export function formatLastReview(lastReviewedAt: string, now: Date): string {
  const days =
    (Date.parse(CALENDAR_DAY.format(now)) -
      Date.parse(CALENDAR_DAY.format(new Date(lastReviewedAt)))) /
    DAY_MS;

  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'hôm qua';
  return `${days} ngày trước`;
}
