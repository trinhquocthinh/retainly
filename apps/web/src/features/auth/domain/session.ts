/** Phiên đăng nhập như API trả về (`GET /api/session`). */
export type Session = {
  userId: string;
  expiresAt: string;
  displayName: string;
  /** `sso` thì mật khẩu nằm ở Authentik — Retainly không cho đổi (BR-027). */
  authMethod: 'local' | 'sso';
};

/** `remember` là ô "Duy trì đăng nhập 30 ngày" (US-019), chỉ gửi khi đăng nhập. */
export type Credentials = { email: string; password: string; remember?: boolean };

export type PasswordChange = { currentPassword: string; newPassword: string };
