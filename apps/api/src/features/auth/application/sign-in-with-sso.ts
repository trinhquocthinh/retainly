import { startSession, type SessionRepository, type StartedSession } from './sessions';
import { assertUserSlotAvailable, UserCounter } from './user-limit';

/** Danh tính Authentik đã xác minh xong (chữ ký, state, nonce, PKCE). */
export type SsoIdentity = {
  subject: string;
  displayName: string;
};

/** Dữ liệu tạm của một lượt đăng nhập, sống giữa bước chuyển hướng và callback. */
export type SsoTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
};

export type SsoClient = {
  startLogin(): Promise<{ authorizationUrl: URL; transaction: SsoTransaction }>;
  finishLogin(callbackUrl: URL, transaction: SsoTransaction): Promise<SsoIdentity>;
};

export type SsoUserRepository = {
  findBySubject(subject: string): Promise<{ id: string } | null>;
  /** Tạo user Just-In-Time (TC-021). Subject đã có (request song song) thì trả lại user đó. */
  createSso(identity: SsoIdentity): Promise<{ id: string }>;
};

type SignInDeps = {
  users: SsoUserRepository;
  sessions: SessionRepository;
  userCounter: UserCounter;
  now: () => Date;
};

export async function signInWithSso(
  deps: SignInDeps,
  identity: SsoIdentity,
): Promise<StartedSession> {
  let user = await deps.users.findBySubject(identity.subject);

  // BR-020 chỉ chặn tạo mới: user đã có vẫn đăng nhập được khi hệ thống đầy.
  if (user === null) {
    await assertUserSlotAvailable(deps);
    user = await deps.users.createSso(identity);
  }

  return startSession(deps, user.id);
}
