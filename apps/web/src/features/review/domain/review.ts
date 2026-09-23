export type DueCard = {
  id: string;
  front: string;
  back: string;
  note: string | null;
  dueDate: string;
};
export type ReviewOutcome = 'remembered' | 'forgotten';

/**
 * Phím mũi tên nào ứng với kết quả nào (bản desktop D2 của bộ màn hình).
 * Tách ra khỏi component để test được mà không phải dựng DOM.
 */
export function outcomeForKey(key: string): ReviewOutcome | undefined {
  if (key === 'ArrowLeft') return 'forgotten';
  if (key === 'ArrowRight') return 'remembered';
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
