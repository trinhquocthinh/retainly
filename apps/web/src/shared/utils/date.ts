import { APP_TIME_ZONE } from '@src/shared/constants/locale';

const DAY_MS = 86_400_000;

// en-CA in ngày dạng YYYY-MM-DD, đổi thẳng được sang mốc UTC để trừ nhau.
const CALENDAR_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE });

/** Số ngày lịch giờ Việt Nam từ `from` tới `to` (âm nếu `to` ở trước), không đếm theo 24 giờ. */
export function calendarDaysBetween(from: Date, to: Date): number {
  return (Date.parse(CALENDAR_DAY.format(to)) - Date.parse(CALENDAR_DAY.format(from))) / DAY_MS;
}

/** Ôn lúc 23h thì sáng mai đã là "hôm qua". */
export function formatLastReview(lastReviewedAt: string, now: Date): string {
  const days = calendarDaysBetween(new Date(lastReviewedAt), now);

  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'hôm qua';
  return `${days} ngày trước`;
}
