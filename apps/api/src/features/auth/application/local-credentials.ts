import { AppError } from '../../../shared/errors';
import { DUMMY_PASSWORD_HASH, makeDisplayName, normalizeEmail } from '../domain/local-credentials';
import { isStrongPassword } from '../domain/password-policy';
import { startSession, type SessionRepository, type StartedSession } from './sessions';
import { assertUserSlotAvailable, UserCounter } from './user-limit';

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
};

export type LocalUserRepository = {
  /** User SSO không có email nên không bao giờ khớp; user nội bộ luôn có `passwordHash`. */
  findByEmail(email: string): Promise<{ id: string; passwordHash: string | null } | null>;
  /** Email đã có (kể cả do request song song chen vào) thì ném `ERR_EMAIL_TAKEN`. */
  createLocal(user: { email: string; passwordHash: string; displayName: string }): Promise<{
    id: string;
  }>;
  /** `passwordHash` là `null` với user SSO (mật khẩu nằm ở Authentik). */
  findById(userId: string): Promise<{ id: string; passwordHash: string | null } | null>;
  /**
   * Đổi hash và huỷ phiên của user trong cùng một transaction (BR-027). Có
   * `keepSessionTokenHash` thì chừa lại đúng phiên đó — người tự đổi mật khẩu
   * không bị đá khỏi chính thiết bị đang dùng.
   */
  replacePassword(
    userId: string,
    passwordHash: string,
    options?: { keepSessionTokenHash: string },
  ): Promise<void>;
};

type LocalCredentialsDeps = {
  localUsers: LocalUserRepository;
  hasher: PasswordHasher;
  sessions: SessionRepository;
  userCounter: UserCounter;
  now: () => Date;
};

type Credentials = { email: string; password: string };

/** SPEC-011 — đăng ký tài khoản nội bộ rồi đăng nhập luôn. `displayName` là ô "Họ và tên" (US-019). */
export async function registerLocal(
  deps: LocalCredentialsDeps,
  input: Credentials & { displayName?: string },
): Promise<StartedSession> {
  if (!isStrongPassword(input.password)) throw new AppError('ERR_WEAK_PASSWORD');
  // trước khi băm Argon2: hệ thống đã đầy thì khỏi tốn CPU.
  await assertUserSlotAvailable(deps);

  const email = normalizeEmail(input.email);
  // Kiểm tra trước để khỏi tốn một lần băm Argon2 cho email đã có.
  if ((await deps.localUsers.findByEmail(email)) !== null) throw new AppError('ERR_EMAIL_TAKEN');

  const user = await deps.localUsers.createLocal({
    email,
    passwordHash: await deps.hasher.hash(input.password),
    displayName: makeDisplayName(input.displayName, email),
  });

  return startSession(deps, user.id);
}

/**
 * SPEC-012 — mọi kiểu sai đều trả chung một lỗi, chống dò tài khoản. `remember`
 * là ô "Duy trì đăng nhập 30 ngày" (US-019); không truyền thì là phiên trình duyệt.
 */
export async function signInLocal(
  deps: LocalCredentialsDeps,
  input: Credentials & { remember?: boolean },
): Promise<StartedSession> {
  const user = await deps.localUsers.findByEmail(normalizeEmail(input.email));

  // Luôn verify, kể cả khi không có user: bỏ qua bước băm thì phản hồi nhanh
  // hẳn, kẻ tấn công đo thời gian là biết email nào chưa đăng ký.
  const matches = await deps.hasher.verify(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    input.password,
  );

  if (user === null || user.passwordHash === null || !matches) {
    throw new AppError('ERR_INVALID_CREDENTIALS');
  }

  return startSession(deps, user.id, { remember: input.remember ?? false });
}
