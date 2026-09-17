import { hashSessionToken } from '../domain/session-token';

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

/** Đăng xuất: huỷ phiên phía server, cookie cũ không dùng lại được nữa. */
export async function endSession(
  deps: Pick<SessionDeps, 'sessions'>,
  token: string,
): Promise<void> {
  await deps.sessions.deleteByTokenHash(hashSessionToken(token));
}
