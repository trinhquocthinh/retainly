const DAY_MS = 86_400_000;
const APP_UTC_OFFSET_MS = 7 * 60 * 60 * 1_000;
/** Ngày số 0 (1970-01-01) là Thứ Năm: lệch 3 ngày so với Thứ Hai đầu tuần. */
const MONDAY_OFFSET = 3;
/** Hai ngày nghỉ liên tiếp làm đứt chuỗi: hai ngày có ôn cách nhau từ 3 trở lên. */
const BREAKING_GAP = 3;

function localDayNumber(date: Date): number {
  return Math.floor((date.getTime() + APP_UTC_OFFSET_MS) / DAY_MS);
}

function dayNumber(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year!, month! - 1, date!) / DAY_MS;
}

function formatDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Ngày có ôn tới hết hôm nay, không trùng, mới nhất trước. */
function distinctDaysUntil(reviewDays: readonly string[], today: number): number[] {
  return [...new Set(reviewDays.map(dayNumber))]
    .filter((day) => day <= today)
    .sort((left, right) => right - left);
}

/**
 * Đếm số ngày thực sự có review trong chuỗi hiện tại.
 * Một ngày nghỉ được ân hạn nhưng không được cộng vào kết quả; hai ngày nghỉ
 * liên tiếp làm đứt chuỗi (BR-006).
 */
export function calculateCurrentStreak(reviewDays: readonly string[], now: Date): number {
  const today = localDayNumber(now);
  const days = distinctDaysUntil(reviewDays, today);

  const latest = days[0];
  if (latest === undefined || today - latest >= 2) return 0;

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = days[index - 1]!;
    const current = days[index]!;
    if (previous - current >= BREAKING_GAP) break;
    streak += 1;
  }

  return streak;
}

/** Kỷ lục: chuỗi dài nhất từng có, cùng luật đếm với chuỗi hiện tại (BR-006). */
export function calculateLongestStreak(reviewDays: readonly string[], now: Date): number {
  const days = distinctDaysUntil(reviewDays, localDayNumber(now));

  let longest = 0;
  let run = 0;
  days.forEach((day, index) => {
    run = index > 0 && days[index - 1]! - day < BREAKING_GAP ? run + 1 : 1;
    longest = Math.max(longest, run);
  });

  return longest;
}

export type ReviewWeekDay = { date: string; reviewed: boolean };

/** Bảy ngày của tuần hiện tại theo giờ Việt Nam, từ Thứ Hai đến Chủ Nhật. */
export function reviewWeek(reviewDays: readonly string[], now: Date): ReviewWeekDay[] {
  const today = localDayNumber(now);
  const monday = today - ((today + MONDAY_OFFSET) % 7);
  const reviewed = new Set(reviewDays);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = formatDay(monday + offset);
    return { date, reviewed: reviewed.has(date) };
  });
}
