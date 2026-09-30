import { APP_LOCALE, APP_TIME_ZONE } from '@src/shared/constants/locale';
import { calendarDaysBetween } from '@src/shared/utils/date';

type TopicRef = { id: string; name: string };

/** Tiến độ hôm nay (B4): thẻ khác nhau đã ôn / (đã ôn ∪ đến hạn tới hết hôm nay). */
export type TodayProgress = { reviewed: number; total: number };

export type TopicDueCount = { topic: TopicRef | null; count: number };

export type UpcomingCard = {
  id: string;
  front: string;
  back: string;
  topic: TopicRef | null;
  dueDate: string;
  reps: number;
};

/** GET /api/home/overview — SPEC-017. */
export type HomeOverview = {
  todayProgress: TodayProgress;
  streak: {
    current: number;
    longest: number;
    week: { date: string; reviewed: boolean }[];
  };
  library: { totalCards: number; topicCount: number; difficultCards: number };
  dueByTopic: TopicDueCount[];
  upcoming: UpcomingCard[];
};

/** Khớp `DIFFICULT_CARD_THRESHOLD` của API — chỉ dùng để giải thích trên giao diện. */
const DIFFICULT_CARD_THRESHOLD = 7.5;

/** Số Topic nêu tên trong câu tóm tắt hàng đợi; phần còn lại gộp thành "N thẻ khác". */
const TOPIC_BREAKDOWN_LIMIT = 3;

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const HOUR = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: APP_TIME_ZONE,
});
const UPCOMING_DATE = new Intl.DateTimeFormat(APP_LOCALE, {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  timeZone: APP_TIME_ZONE,
});

/** `dueByTopic` gồm mọi thẻ đến hạn tới hết hôm nay, trùng `dueCount` của SPEC-003. */
export function countDue(dueByTopic: readonly TopicDueCount[]): number {
  return dueByTopic.reduce((sum, group) => sum + group.count, 0);
}

/** Lời chào theo giờ Việt Nam, không theo múi giờ của máy đang mở trang. */
export function greetingFor(now: Date): string {
  const hour = Number(HOUR.format(now));

  if (hour >= 4 && hour < 11) return 'Chào buổi sáng';
  if (hour >= 11 && hour < 14) return 'Chào buổi trưa';
  if (hour >= 14 && hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export type DueTopicSummary = {
  groups: { name: string | null; count: number }[];
  otherCount: number;
};

/**
 * "Gồm 4 thẻ A, 3 thẻ B và 2 thẻ khác". Không có thẻ nào gắn Topic thì câu này
 * chỉ lặp lại con số phía trên, nên trả `null` để ẩn đi.
 */
export function summarizeDueTopics(dueByTopic: readonly TopicDueCount[]): DueTopicSummary | null {
  if (dueByTopic.every((group) => group.topic === null)) return null;

  const named = dueByTopic.slice(0, TOPIC_BREAKDOWN_LIMIT);

  return {
    groups: named.map((group) => ({ name: group.topic?.name ?? null, count: group.count })),
    otherCount: countDue(dueByTopic.slice(TOPIC_BREAKDOWN_LIMIT)),
  };
}

export type WeekDayState = 'reviewed' | 'missed' | 'today' | 'future';

export type WeekDay = { date: string; label: string; state: WeekDayState; isToday: boolean };

/** Dải T2–CN. API chỉ báo ngày có ôn; hôm nay và tương lai do máy khách tự phân biệt. */
export function describeWeek(
  week: readonly { date: string; reviewed: boolean }[],
  now: Date,
): WeekDay[] {
  return week.map((day, index) => {
    // `YYYY-MM-DD` được đọc là 00:00 UTC, tức 07:00 cùng ngày giờ Việt Nam.
    const daysAgo = calendarDaysBetween(new Date(day.date), now);
    const isToday = daysAgo === 0;
    let state: WeekDayState = 'missed';

    if (day.reviewed) state = 'reviewed';
    else if (isToday) state = 'today';
    else if (daysAgo < 0) state = 'future';

    return { date: day.date, label: WEEKDAY_LABELS[index] ?? '', state, isToday };
  });
}

/** "+3 ngày" và "Thứ Sáu, 11/09" — đếm theo ngày lịch như badge hạn ôn của Thư viện. */
export function describeUpcoming(dueDate: string, now: Date) {
  const due = new Date(dueDate);

  return {
    daysAhead: calendarDaysBetween(now, due),
    dateLabel: UPCOMING_DATE.format(due),
  };
}
