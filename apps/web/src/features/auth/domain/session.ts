/** Phiên đăng nhập như API trả về (`GET /api/session`). */
export type Session = { userId: string; expiresAt: string; displayName: string };

export type Credentials = { email: string; password: string };
