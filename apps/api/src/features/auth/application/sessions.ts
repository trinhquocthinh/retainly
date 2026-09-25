import { hashSessionToken, newSessionToken, SESSION_TTL_MS } from '../domain/session-token';

export type SessionRecord = {
  userId: string;
  expiresAt: Date;
};

/** Cách User xác thực: mật khẩu tại Retainly hay Authentik SSO (BR-022, không đổi được). */
type AuthMethod = 'local' | 'sso';

/**
 * Phiên đang dùng, kèm tên hiển thị của chủ phiên để UI chào đúng người và
 * cách đăng nhập để UI biết có cho đổi mật khẩu hay không (BR-027).
 */
export type ActiveSession = SessionRecord & { displayName: string; authMethod: AuthMethod };

export type SessionRepository = {
  create(session: SessionRecord & { tokenHash: string }): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<ActiveSession | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
};

type SessionDeps = {
  sessions: SessionRepository;
  now: () => Date;
};

/** Token từ cookie → phiên còn hạn, hoặc null. Phiên hết hạn bị dọn luôn. */
export async function resolveSession(
  deps: SessionDeps,
  token: string,
): Promise<ActiveSession | null> {
  const tokenHash = hashSessionToken(token);
  const session = await deps.sessions.findByTokenHash(tokenHash);
  if (session === null) return null;

  if (session.expiresAt.getTime() <= deps.now().getTime()) {
    await deps.sessions.deleteByTokenHash(tokenHash);
    return null;
  }

  return session;
}

/** Mở phiên 14 ngày cho user đã xác thực (SSO hay nội bộ đều đi qua đây). */
export async function startSession(
  deps: SessionDeps,
  userId: string,
): Promise<{ token: string; session: SessionRecord }> {
  const token = newSessionToken();
  const session: SessionRecord = {
    userId,
    expiresAt: new Date(deps.now().getTime() + SESSION_TTL_MS),
  };

  await deps.sessions.create({ tokenHash: hashSessionToken(token), ...session });

  return { token, session };
}

/** Đăng xuất: huỷ phiên phía server, cookie cũ không dùng lại được nữa. */
export async function endSession(
  deps: Pick<SessionDeps, 'sessions'>,
  token: string,
): Promise<void> {
  await deps.sessions.deleteByTokenHash(hashSessionToken(token));
}
