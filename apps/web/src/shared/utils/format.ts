import { APP_LOCALE } from '@src/shared/constants/locale';

const ONE_DECIMAL = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 1 });

/** Tỷ lệ 0–1 thành phần trăm nguyên, ví dụ 0,914 → "91%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** Độ ổn định S của FSRS, một chữ số thập phân kèm đơn vị: 13,83 → "13,8 ngày". */
export function formatStability(stability: number): string {
  return `${ONE_DECIMAL.format(stability)} ngày`;
}

/** Độ khó D của FSRS (1–10), một chữ số thập phân: 2,11 → "2,1". */
export function formatDifficulty(difficulty: number): string {
  return ONE_DECIMAL.format(difficulty);
}
