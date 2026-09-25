import { createHash, randomBytes } from 'node:crypto';

/**
 * Phiên mặc định: cookie không có `Expires` nên đóng trình duyệt là mất, và server
 * vẫn tự huỷ sau 24 giờ phòng khi trình duyệt khôi phục cookie lúc mở lại.
 * Không gia hạn trượt.
 */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Tick "Duy trì đăng nhập 30 ngày" ở màn đăng nhập (US-019): cookie và phiên cùng sống 30 ngày. */
export const REMEMBERED_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Token trả cho trình duyệt: 32 byte ngẫu nhiên, mã hoá base64url. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Database chỉ lưu sha256 của token. Lộ bảng `sessions` (backup, log SQL) cũng
 * không dựng lại được cookie. Token đã đủ 256 bit ngẫu nhiên nên không cần salt.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
