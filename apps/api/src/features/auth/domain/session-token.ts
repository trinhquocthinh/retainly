import { createHash, randomBytes } from 'node:crypto';

/** Phiên sống cố định 14 ngày kể từ lúc đăng nhập, không gia hạn trượt. */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

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
