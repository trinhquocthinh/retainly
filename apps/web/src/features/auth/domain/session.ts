/** Phiên đăng nhập như API trả về (`GET /api/session`). */
export type Session = {
  userId: string;
  expiresAt: string;
  displayName: string;
  /** `sso` thì mật khẩu nằm ở Authentik — Retainly không cho đổi (BR-027). */
  authMethod: 'local' | 'sso';
};

/**
 * `displayName` là ô "Họ và tên", chỉ gửi khi đăng ký; `remember` là ô "Duy trì
 * đăng nhập 30 ngày", chỉ gửi khi đăng nhập (US-019).
 */
export type Credentials = {
  email: string;
  password: string;
  displayName?: string;
  remember?: boolean;
};

export type PasswordChange = { currentPassword: string; newPassword: string };
