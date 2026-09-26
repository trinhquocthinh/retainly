import { calendarDaysBetween, formatLastReview } from '@src/shared/utils/date';
import { formatDifficulty, formatStability } from '@src/shared/utils/format';

import type { CardDraft } from './cardDraft';

/** Tóm tắt lịch FSRS của thẻ (SPEC-015). `state = new` thì S, D còn là 0. */
export type CardScheduleSummary = {
  state: string;
  dueDate: string;
  stability: number;
  difficulty: number;
  lastReviewedAt: string | null;
};

export type CardListItem = {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  note: string | null;
  createdAt: string;
  topic: { id: string; name: string } | null;
  source: { id: string; title: string } | null;
  schedule: CardScheduleSummary;
};

/** Số thẻ theo Topic — tính theo từ khoá nhưng bỏ qua bộ lọc Topic (faceted). */
export type TopicCounts = {
  all: number;
  unassigned: number;
  topics: { id: string; name: string; cardCount: number }[];
};

export type CardListResponse = {
  items: CardListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  topicCounts: TopicCounts;
};

export const CARD_SORTS = ['recent', 'due', 'stability', 'difficulty'] as const;
export type CardSort = (typeof CARD_SORTS)[number];

export const SORT_LABELS: Record<CardSort, string> = {
  recent: 'Mới thêm gần đây',
  due: 'Cần ôn sớm nhất',
  stability: 'Cần củng cố thêm',
  difficulty: 'Thường trả lời chưa đúng',
};

/** Giá trị `topic` của API cho "Chưa gán". */
export const UNASSIGNED_TOPIC = 'none';

/** `topic` rỗng = mọi Topic; `q` giữ nguyên chữ người dùng gõ, API tự gỡ định dạng và khoảng trắng. */
export type LibraryFilters = {
  q: string;
  sort: CardSort;
  topic: string;
  page: number;
};

export const SEARCH_MAX_LENGTH = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCardSort(value: string | null): value is CardSort {
  return CARD_SORTS.some((sort) => sort === value);
}

/**
 * Đọc bộ lọc từ URL. Giá trị hỏng (sửa tay, link cũ) quay về mặc định thay vì
 * để API trả 400 rồi cả trang hiện lỗi.
 */
export function parseLibraryFilters(params: URLSearchParams): LibraryFilters {
  const sort = params.get('sort');
  const topic = params.get('topic') ?? '';
  const page = Number(params.get('page'));

  return {
    q: (params.get('q') ?? '').slice(0, SEARCH_MAX_LENGTH),
    sort: isCardSort(sort) ? sort : 'recent',
    topic: topic === UNASSIGNED_TOPIC || UUID_PATTERN.test(topic) ? topic : '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Bỏ giá trị mặc định để URL gọn: `/cards` chứ không phải `/cards?sort=recent&page=1`. */
export function toSearchParams(filters: LibraryFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q !== '') params.set('q', filters.q);
  if (filters.sort !== 'recent') params.set('sort', filters.sort);
  if (filters.topic !== '') params.set('topic', filters.topic);
  if (filters.page > 1) params.set('page', String(filters.page));

  return params;
}

export function isFiltering(filters: LibraryFilters): boolean {
  return filters.q.trim() !== '' || filters.topic !== '';
}

export type DueStatus =
  | { tone: 'new'; label: string }
  | { tone: 'due'; label: string }
  | { tone: 'upcoming'; label: string };

/** Badge hạn ôn, đếm theo ngày lịch giờ Việt Nam như hàng đợi ôn. */
export function describeDue(schedule: CardScheduleSummary, now: Date): DueStatus {
  if (schedule.state === 'new') return { tone: 'new', label: 'Thẻ mới' };

  const days = calendarDaysBetween(now, new Date(schedule.dueDate));

  if (days < 0) return { tone: 'due', label: `Cần ôn từ ${-days} ngày trước` };
  if (days === 0) return { tone: 'due', label: 'Cần ôn hôm nay' };
  return { tone: 'upcoming', label: `Ôn sau ${days} ngày` };
}

export type MemoryFacts = { stability: string; difficulty: string; lastReview: string };

/** S, D và lần ôn gần nhất để hiển thị. Thẻ chưa ôn có S = D = 0 — chưa đo được gì nên `null`. */
export function describeMemoryFacts(schedule: CardScheduleSummary, now: Date): MemoryFacts | null {
  if (schedule.lastReviewedAt === null) return null;

  return {
    stability: formatStability(schedule.stability),
    difficulty: formatDifficulty(schedule.difficulty),
    lastReview: formatLastReview(schedule.lastReviewedAt, now),
  };
}

/** Thẻ đục lỗ có thể không có mặt sau; khi đó mặt hỏi đã hiện đáp án điền sẵn. */
export function hasAnswer(card: CardListItem): boolean {
  return card.back !== '' || card.note !== null;
}

/** Gửi đủ ba trường; ghi chú rỗng nghĩa là xoá ghi chú. */
export type UpdateCardInput = CardDraft;

/** Chỉ mang phần đã đổi. `topicId: null` là bỏ gán Topic. */
export type CardEdit = {
  content?: UpdateCardInput;
  topicId?: string | null;
};

export type DeletedCard = { deleted: true };
