import { hashSessionToken, newSessionToken, SESSION_TTL_MS } from '../domain/session-token';

export type SessionRecord = {
  userId: string;
  expiresAt: Date;
};

export type SessionRepository = {
  create(session: SessionRecord & { tokenHash: string }): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
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
): Promise<SessionRecord | null> {
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
