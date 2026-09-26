import { AppError } from '../../../shared/errors';
import { isPublicUnicastAddress } from './private-address';

/** Hostname nội bộ không bao giờ được phép, kể cả khi DNS phân giải ra IP công khai. */
const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa'];
const ALLOWED_PORTS = ['', '80', '443'];

/**
 * Chuẩn hoá và kiểm tra URL nguồn (SPEC-001, TC-003).
 * Chạy hoàn toàn offline: sai cú pháp, sai scheme, có credential, hostname nội bộ
 * hoặc IP literal thuộc dải riêng đều bị chặn TRƯỚC khi phát sinh request mạng.
 */
export function parseSourceUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new AppError('ERR_INVALID_URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new AppError('ERR_INVALID_URL');
  if (url.username !== '' || url.password !== '') throw new AppError('ERR_INVALID_URL');
  if (!ALLOWED_PORTS.includes(url.port)) throw new AppError('ERR_INVALID_URL');

  const hostname = normalizeHostname(url.hostname);
  if (hostname.length === 0) throw new AppError('ERR_INVALID_URL');
  if (hostname === 'localhost' || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new AppError('ERR_INVALID_URL');
  }
  if (isIpLiteral(hostname) && !isPublicUnicastAddress(hostname)) {
    throw new AppError('ERR_INVALID_URL');
  }

  return url;
}

/** Bỏ dấu chấm root (`example.com.`) và ngoặc vuông của IPv6 literal (`[::1]`). */
export function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

function isIpLiteral(hostname: string): boolean {
  return /^[0-9.]+$/.test(hostname) || hostname.includes(':');
}
