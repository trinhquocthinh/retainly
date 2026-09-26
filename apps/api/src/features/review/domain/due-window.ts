/**
 * Lệch giờ của Asia/Ho_Chi_Minh so với UTC, tính bằng phút.
 * Việt Nam bỏ giờ mùa hè từ 1975 nên giá trị này là hằng số, không phụ thuộc thời điểm.
 * Khai tường minh thay vì đọc TZ của tiến trình: máy dev và runner CI không đặt TZ,
 * dựa vào giờ hệ thống sẽ khiến test xanh hay đỏ tuỳ máy chạy. Xem tech-spec §3.
 */
const APP_UTC_OFFSET_MINUTES = 7 * 60;

const OFFSET_MS = APP_UTC_OFFSET_MINUTES * 60_000;
const DAY_MS = 86_400_000;

/**
 * Mốc cuối ngày hiện tại theo giờ Việt Nam (SPEC-003).
 * Mọi Card có due_date <= mốc này được coi là đến hạn hôm nay.
 */
export function endOfToday(now: Date): Date {
  const local = new Date(now.getTime() + OFFSET_MS);
  const endOfLocalDay = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    23,
    59,
    59,
    999,
  );

  return new Date(endOfLocalDay - OFFSET_MS);
}

/**
 * Mốc đầu ngày hiện tại theo giờ Việt Nam: ngay sau cuối ngày hôm qua.
 * Outcome có reviewed_at >= mốc này là "đã ôn hôm nay" (BR-026).
 */
export function startOfToday(now: Date): Date {
  return new Date(endOfToday(now).getTime() - DAY_MS + 1);
}
