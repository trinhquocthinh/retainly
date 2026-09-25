/** Phiên đăng nhập như API trả về (`GET /api/session`). */
export type Session = {
  userId: string;
  expiresAt: string;
  displayName: string;
  /** `sso` thì mật khẩu nằm ở Authentik — Retainly không cho đổi (BR-027). */
  authMethod: 'local' | 'sso';
};

export type Credentials = { email: string; password: string };

export type PasswordChange = { currentPassword: string; newPassword: string };
