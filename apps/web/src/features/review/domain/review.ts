export type DueCard = { id: string; front: string; back: string; dueDate: string };
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

/** Phần trăm đã ôn xong trong phiên, dùng cho thanh tiến trình. */
export function progressPercent(reviewed: number, total: number): number {
  return total === 0 ? 0 : Math.round((reviewed / total) * 100);
}
