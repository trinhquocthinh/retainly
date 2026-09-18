import { startSession, type SessionRecord, type SessionRepository } from './sessions';

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
  /** Tìm user theo `external_auth_id`, chưa có thì tạo mới (Just-In-Time, TC-021). */
  findOrCreateBySubject(identity: SsoIdentity): Promise<{ id: string }>;
};

type SignInDeps = {
  users: SsoUserRepository;
  sessions: SessionRepository;
  now: () => Date;
};

export async function signInWithSso(
  deps: SignInDeps,
  identity: SsoIdentity,
): Promise<{ token: string; session: SessionRecord }> {
  const user = await deps.users.findOrCreateBySubject(identity);
  return startSession(deps, user.id);
}
