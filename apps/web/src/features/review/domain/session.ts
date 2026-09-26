import type { ReviewOutcome } from './review';

/** Chưa chấm thẻ nào thì chưa biết nhịp của người ôn: tạm tính 8 giây mỗi thẻ. */
export const DEFAULT_SECONDS_PER_CARD = 8;

/**
 * Trần nhịp mỗi thẻ. Bỏ dở phiên đi pha cà phê rồi quay lại thì trung bình vọt
 * lên hàng phút; không chặn thì "còn lại" nhảy lên cả tiếng đồng hồ.
 */
export const MAX_SECONDS_PER_CARD = 60;

/** Kết quả theo vị trí thẻ trong phiên; `null` là thẻ bị bỏ qua vì lưu hỏng. */
export type SessionResults = readonly (ReviewOutcome | null)[];

export type SessionTally = { reviewed: number; remembered: number; forgotten: number };

export function estimateRemainingMinutes({
  remaining,
  reviewed,
  elapsedMs,
}: {
  remaining: number;
  reviewed: number;
  elapsedMs: number;
}): number {
  if (remaining <= 0) return 0;

  const secondsPerCard =
    reviewed === 0
      ? DEFAULT_SECONDS_PER_CARD
      : Math.min(elapsedMs / 1000 / reviewed, MAX_SECONDS_PER_CARD);

  // Làm tròn lên và tối thiểu 1: "~0 phút" khi vẫn còn thẻ là nói dối.
  return Math.max(1, Math.ceil((remaining * secondsPerCard) / 60));
}

export function tallySession(results: SessionResults): SessionTally {
  const remembered = results.filter((outcome) => outcome === 'remembered').length;
  const forgotten = results.filter((outcome) => outcome === 'forgotten').length;

  return { reviewed: remembered + forgotten, remembered, forgotten };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds} giây`;
  if (seconds === 0) return `${minutes} phút`;
  return `${minutes} phút ${seconds} giây`;
}
