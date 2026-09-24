import type { CardMemory } from './memory';

export type DueCard = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  dueDate: string;
  memory: CardMemory;
};
export type ReviewOutcome = 'remembered' | 'forgotten';

/**
 * Phiên ôn lấy thẻ từ đâu: hàng đợi đến hạn (SPEC-003), Ôn thêm (SPEC-014,
 * BR-026) hay hàng đợi đến hạn của một Topic ("Ôn ngay" ở màn Thống kê).
 */
export type ReviewSource = 'due' | 'extra' | 'topic';

/** Tên Topic đi kèm khi điều hướng sang phiên ôn theo Topic, để khỏi gọi thêm API. */
export type TopicReviewState = { topicName?: string };

/** Props `to` + `state` của `<Link>` mở phiên ôn các thẻ đến hạn của một Topic. */
export function topicReviewLink(topic: { id: string; name: string }): {
  to: string;
  state: TopicReviewState;
} {
  return { to: `/review/topic/${topic.id}`, state: { topicName: topic.name } };
}

/**
 * Phím nào ứng với kết quả nào: mũi tên (bản desktop D2) hoặc số 1/2 theo thứ tự
 * nút trên màn (design 0.1.2). Tách khỏi component để test không cần dựng DOM.
 */
export function outcomeForKey(key: string): ReviewOutcome | undefined {
  if (key === 'ArrowLeft' || key === '1') return 'forgotten';
  if (key === 'ArrowRight' || key === '2') return 'remembered';
  return undefined;
}

/**
 * Phím Z hoàn tác lượt vừa ôn (US-014). Có phím bổ trợ thì bỏ qua: Ctrl/Cmd+Z
 * là hoàn tác của trình duyệt, cướp nó sẽ xoá nhầm một lượt ôn.
 */
export function isUndoKey(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key === 'z' || event.key === 'Z';
}

/** Phần trăm đã ôn xong trong phiên, dùng cho thanh tiến trình. */
export function progressPercent(reviewed: number, total: number): number {
  return total === 0 ? 0 : Math.round((reviewed / total) * 100);
}

/**
 * Vuốt vượt quãng đường này (px) thì tính là đã đánh giá; dưới ngưỡng thì thẻ
 * bật về chỗ cũ. Đặt ở domain để test được mà không phải giả lập cử chỉ, và để
 * chỉnh ngưỡng không phải mở file component.
 */
export const SWIPE_COMMIT_DISTANCE = 110;

export function outcomeForSwipe(deltaX: number): ReviewOutcome | undefined {
  if (deltaX >= SWIPE_COMMIT_DISTANCE) return 'remembered';
  if (deltaX <= -SWIPE_COMMIT_DISTANCE) return 'forgotten';
  return undefined;
}
