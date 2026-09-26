import { formatDifficulty, formatPercent, formatStability } from '@src/shared/utils/format';

/**
 * Chỉ số trí nhớ server tính sẵn lúc nạp hàng đợi (SPEC-003, US-016). Cả phiên
 * không nạp lại nên R là giá trị tại đầu phiên, đủ chính xác cho một lượt ôn.
 */
export type CardMemory = {
  stability: number;
  difficulty: number;
  retrievability: number;
  lastReviewedAt: string | null;
  forecastDays: { remembered: number; forgotten: number };
};

/** Chưa ôn lần nào thì chưa có trí nhớ để đo — S, D, R đều vô nghĩa. */
export function isNewCard(memory: CardMemory): boolean {
  return memory.lastReviewedAt === null;
}

export function formatMemory(memory: CardMemory) {
  return {
    stability: formatStability(memory.stability),
    difficulty: formatDifficulty(memory.difficulty),
    retrievability: formatPercent(memory.retrievability),
  };
}

export function formatForecast(days: number): string {
  return `+${days} ngày`;
}
