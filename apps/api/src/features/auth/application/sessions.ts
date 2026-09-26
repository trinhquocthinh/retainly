import {
  hashSessionToken,
  newSessionToken,
  REMEMBERED_SESSION_TTL_MS,
  SESSION_TTL_MS,
} from '../domain/session-token';

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

/**
 * Phiên vừa mở kèm token cho cookie. `remember` quyết định cookie có `Expires`
 * hay không; DB không cần lưu cờ này vì `expiresAt` đã phản ánh lựa chọn.
 */
export type StartedSession = { token: string; session: SessionRecord; remember: boolean };

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

/**
 * Mở phiên cho user đã xác thực (SSO hay nội bộ đều đi qua đây). Chỉ đăng nhập
 * nội bộ có ô "Duy trì đăng nhập"; đăng ký và SSO luôn là phiên trình duyệt.
 */
export async function startSession(
  deps: SessionDeps,
  userId: string,
  { remember }: { remember: boolean } = { remember: false },
): Promise<StartedSession> {
  const token = newSessionToken();
  const ttl = remember ? REMEMBERED_SESSION_TTL_MS : SESSION_TTL_MS;
  const session: SessionRecord = { userId, expiresAt: new Date(deps.now().getTime() + ttl) };

  await deps.sessions.create({ tokenHash: hashSessionToken(token), ...session });

  return { token, session, remember };
}

/** Đăng xuất: huỷ phiên phía server, cookie cũ không dùng lại được nữa. */
export async function endSession(
  deps: Pick<SessionDeps, 'sessions'>,
  token: string,
): Promise<void> {
  await deps.sessions.deleteByTokenHash(hashSessionToken(token));
}
