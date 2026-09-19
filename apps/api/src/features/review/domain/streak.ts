const DAY_MS = 86_400_000;
const APP_UTC_OFFSET_MS = 7 * 60 * 60 * 1_000;

function localDayNumber(date: Date): number {
  return Math.floor((date.getTime() + APP_UTC_OFFSET_MS) / DAY_MS);
}

function dayNumber(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year!, month! - 1, date!) / DAY_MS;
}

/**
 * Đếm số ngày thực sự có review trong chuỗi hiện tại.
 * Một ngày nghỉ được ân hạn nhưng không được cộng vào kết quả; hai ngày nghỉ
 * liên tiếp làm đứt chuỗi (BR-006).
 */
export function calculateCurrentStreak(reviewDays: readonly string[], now: Date): number {
  const today = localDayNumber(now);
  const days = [...new Set(reviewDays.map(dayNumber))]
    .filter((day) => day <= today)
    .sort((left, right) => right - left);

  const latest = days[0];
  if (latest === undefined || today - latest >= 2) return 0;

  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = days[index - 1]!;
    const current = days[index]!;
    if (previous - current >= 3) break;
    streak += 1;
  }

  return streak;
}
