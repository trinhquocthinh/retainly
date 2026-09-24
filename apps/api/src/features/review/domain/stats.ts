import { startOfToday } from './due-window';
import { dayNumber, distinctDaysUntil, formatDay, localDayNumber, reviewWeek } from './streak';

const DAY_MS = 86_400_000;

/** "30 ngày gần nhất": 30 ngày giờ Việt Nam, tính cả hôm nay. */
const RECENT_RANGE_DAYS = 30;

export const STATS_RANGES = ['30d', 'all'] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

/** Ngày đầu và cuối của khoảng, dạng `YYYY-MM-DD` giờ Việt Nam. */
export type StatsPeriod = { from: string | null; to: string };

/** Tỷ lệ ngày có ôn trên khoảng. */
export type Consistency = { reviewDays: number; totalDays: number; rate: number | null };

export type WeekActivityDay = { date: string; reviews: number };

/** Tỷ lệ `part / whole`; `null` khi mẫu số bằng 0 để giao diện không hiện 0% giả. */
export function ratio(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

/** 00:00 UTC của ngày số `day` là 07:00 giờ Việt Nam cùng ngày. */
function startOfLocalDay(day: number): Date {
  return startOfToday(new Date(day * DAY_MS));
}

function firstRecentDay(now: Date): number {
  return localDayNumber(now) - RECENT_RANGE_DAYS + 1;
}

/** Mốc lọc `reviewed_at` của khoảng; `all` không chặn dưới. */
export function rangeStart(range: StatsRange, now: Date): Date | null {
  return range === 'all' ? null : startOfLocalDay(firstRecentDay(now));
}

/**
 * Khoảng và tỷ lệ ngày có ôn. `30d` luôn đủ 30 ngày; `all` tính từ ngày có lượt
 * ôn đầu tiên tới hôm nay, chưa ôn lần nào thì khoảng rỗng.
 */
export function describePeriod(
  range: StatsRange,
  reviewDays: readonly string[],
  now: Date,
): { period: StatsPeriod; consistency: Consistency } {
  const today = localDayNumber(now);
  const days = distinctDaysUntil(reviewDays, today);
  const first = range === 'all' ? days.at(-1) : firstRecentDay(now);

  if (first === undefined) {
    return {
      period: { from: null, to: formatDay(today) },
      consistency: { reviewDays: 0, totalDays: 0, rate: null },
    };
  }

  const reviewed = days.filter((day) => day >= first).length;
  const totalDays = today - first + 1;

  return {
    period: { from: formatDay(first), to: formatDay(today) },
    consistency: { reviewDays: reviewed, totalDays, rate: ratio(reviewed, totalDays) },
  };
}

/** Đầu Thứ Hai của tuần hiện tại, giờ Việt Nam. */
export function weekStart(now: Date): Date {
  return startOfLocalDay(dayNumber(reviewWeek([], now)[0]!.date));
}

/** Số lượt ôn từng ngày T2–CN của tuần hiện tại; ngày không có lượt nào là 0. */
export function weekActivity(counts: readonly WeekActivityDay[], now: Date): WeekActivityDay[] {
  const reviews = new Map(counts.map((day) => [day.date, day.reviews]));

  return reviewWeek([], now).map(({ date }) => ({ date, reviews: reviews.get(date) ?? 0 }));
}
