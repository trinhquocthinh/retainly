import { api } from '@src/shared/api/client';

import type { Credentials, Session } from '../domain/session';

type SessionResponse = { session: Session };

/** GET /api/session — 401 khi chưa đăng nhập. */
export function fetchSession(): Promise<Session> {
  return api.get<SessionResponse>('/session').then(({ session }) => session);
}

/**
 * POST /api/auth/login — SPEC-012. Chỉ cần biết thành công: cookie phiên do máy
 * chủ đặt, thông tin phiên (kèm tên hiển thị) đọc lại qua `fetchSession`.
 */
export async function signIn(credentials: Credentials): Promise<void> {
  await api.post<unknown>('/auth/login', credentials);
}

/** POST /api/auth/register — SPEC-011, BR-020. */
export async function register(credentials: Credentials): Promise<void> {
  await api.post<unknown>('/auth/register', credentials);
}

/** POST /api/auth/logout — 204, xoá phiên phía máy chủ. */
export function signOut(): Promise<void> {
  return api.post<void>('/auth/logout', {});
}

/**
 * Luồng OIDC cần trình duyệt đi hẳn sang Authentik (không phải fetch) để cookie
 * tạm và redirect hoạt động. Tách ra hàm riêng để test thay được.
 */
export function redirectToSso(): void {
  window.location.assign('/api/auth/sso/login');
}
