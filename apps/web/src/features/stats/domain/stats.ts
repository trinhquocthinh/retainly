import { estimateRemainingMinutes } from '@src/features/review/domain/session';
import { APP_LOCALE } from '@src/shared/constants/locale';
import { calendarDaysBetween } from '@src/shared/utils/date';

export type StatsRange = '30d' | 'all';

type TopicRef = { id: string; name: string };

/** Một Topic có lượt ôn trong khoảng. `averageDifficulty` và `dueCount` là số liệu hiện tại. */
export type TopicStats = {
  topic: TopicRef;
  reviews: number;
  forgotten: number;
  forgetRate: number;
  reviewShare: number;
  averageDifficulty: number | null;
  dueCount: number;
};

/** GET /api/stats — SPEC-018. Mọi tỷ lệ là số thực 0–1, `null` khi mẫu số bằng 0. */
export type Stats = {
  range: StatsRange;
  period: { from: string | null; to: string };
  consistency: { reviewDays: number; totalDays: number; rate: number | null };
  streak: { current: number; longest: number };
  durable: { cards: number; totalCards: number; share: number | null };
  recall: { remembered: number; total: number; rate: number | null; target: number };
  topics: TopicStats[];
  week: { date: string; reviews: number }[];
};

/** Giá trị lạ trên URL thì về mặc định, không báo lỗi. */
export function parseRange(value: string | null): StatsRange {
  return value === 'all' ? 'all' : '30d';
}

const ONE_DECIMAL = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1 });

/** Tỷ lệ 0–1 thành phần trăm một chữ số thập phân: 0,148 → "14,8%", 0,2 → "20%". */
export function formatRate(ratio: number): string {
  return `${ONE_DECIMAL.format(ratio * 100)}%`;
}

/** "26/08 – 24/09"; khác năm thì ghi cả năm. Chưa ôn lần nào thì không có khoảng. */
export function formatPeriod({ from, to }: Stats['period']): string | null {
  if (!from) return null;

  // Tách chuỗi thay vì dựng Date: `YYYY-MM-DD` đã là ngày giờ Việt Nam.
  const [fromYear, fromMonth, fromDay] = from.split('-');
  const [toYear, toMonth, toDay] = to.split('-');

  if (fromYear !== toYear) {
    return `${fromDay}/${fromMonth}/${fromYear} – ${toDay}/${toMonth}/${toYear}`;
  }
  return `${fromDay}/${fromMonth} – ${toDay}/${toMonth}`;
}

export type RecallGap = { direction: 'above' | 'below' | 'equal'; points: string };

/** Chênh lệch tỷ lệ nhớ lại so với mục tiêu FSRS, tính bằng điểm phần trăm. */
export function describeRecallGap(rate: number, target: number): RecallGap {
  const points = Math.round((rate - target) * 1000) / 10;

  if (points === 0) return { direction: 'equal', points: '0' };
  return {
    direction: points > 0 ? 'above' : 'below',
    points: ONE_DECIMAL.format(Math.abs(points)),
  };
}

/**
 * Sắc thái của một nhánh kiến thức, giữ ngưỡng design statistical từ E6:
 * đỏ khi quên từ 20% trở lên, xanh khi dưới hoặc bằng 10%, còn lại trung tính.
 */
export type ForgetTone = 'danger' | 'neutral' | 'success';

const DANGER_FROM = 0.2;
const SUCCESS_UPTO = 0.1;

export function forgetTone(forgetRate: number): ForgetTone {
  if (forgetRate >= DANGER_FROM) return 'danger';
  if (forgetRate <= SUCCESS_UPTO) return 'success';
  return 'neutral';
}

export type StatsAdvice =
  | {
      /** `attention` khi nhánh được chọn còn đáng lo, `steady` khi nó đã dưới ngưỡng an toàn. */
      level: 'attention' | 'steady';
      topic: TopicRef;
      forgetRate: number;
      dueCount: number;
      minutes: number;
    }
  | { level: 'clear' };

/**
 * Đề xuất bám nhánh có tỷ lệ quên cao nhất **trong các nhánh còn thẻ đến hạn**,
 * để nút bấm luôn dẫn tới việc làm được ngay. Máy chủ đã sắp giảm dần theo tỷ
 * lệ quên nên nhánh đầu tiên khớp là nhánh cần chọn. Không có Topic nào thì
 * không có gì để đề xuất.
 */
export function pickAdvice(topics: readonly TopicStats[]): StatsAdvice | null {
  if (topics.length === 0) return null;

  const target = topics.find((row) => row.dueCount > 0);
  if (!target) return { level: 'clear' };

  return {
    level: forgetTone(target.forgetRate) === 'success' ? 'steady' : 'attention',
    topic: target.topic,
    forgetRate: target.forgetRate,
    dueCount: target.dueCount,
    minutes: estimateRemainingMinutes({ remaining: target.dueCount, reviewed: 0, elapsedMs: 0 }),
  };
}

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

type ActivityDay = {
  date: string;
  label: string;
  name: string;
  reviews: number;
  /** Chiều cao cột so với ngày nhiều lượt nhất tuần, 0–100. */
  height: number;
  isToday: boolean;
  isFuture: boolean;
  isPeak: boolean;
};

export type WeekActivity = {
  days: ActivityDay[];
  total: number;
  /** Ngày đầu tiên đạt số lượt cao nhất; `null` khi cả tuần chưa ôn. */
  peak: { name: string; reviews: number } | null;
};

/** Cột lượt ôn T2–CN; hôm nay và tương lai do máy khách tự phân biệt như dải tuần Trang chủ. */
export function describeWeekActivity(week: Stats['week'], now: Date): WeekActivity {
  const max = Math.max(0, ...week.map((day) => day.reviews));

  const days = week.map((day, index) => {
    // `YYYY-MM-DD` được đọc là 00:00 UTC, tức 07:00 cùng ngày giờ Việt Nam.
    const daysAgo = calendarDaysBetween(new Date(day.date), now);

    return {
      date: day.date,
      label: WEEKDAY_LABELS[index] ?? '',
      name: WEEKDAY_NAMES[index] ?? '',
      reviews: day.reviews,
      height: max === 0 ? 0 : Math.round((day.reviews / max) * 100),
      isToday: daysAgo === 0,
      isFuture: daysAgo < 0,
      isPeak: max > 0 && day.reviews === max,
    };
  });

  const peak = days.find((day) => day.isPeak);

  return {
    days,
    total: week.reduce((sum, day) => sum + day.reviews, 0),
    peak: peak ? { name: peak.name, reviews: peak.reviews } : null,
  };
}
