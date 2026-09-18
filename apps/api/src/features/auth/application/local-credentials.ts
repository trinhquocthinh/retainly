import { AppError } from '../../../shared/errors';
import {
  displayNameFromEmail,
  DUMMY_PASSWORD_HASH,
  isStrongPassword,
  normalizeEmail,
} from '../domain/local-credentials';
import { startSession, type SessionRecord, type SessionRepository } from './sessions';

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
};

type LocalCredentialsDeps = {
  localUsers: LocalUserRepository;
  hasher: PasswordHasher;
  sessions: SessionRepository;
  now: () => Date;
};

type Credentials = { email: string; password: string };
type SignedIn = { token: string; session: SessionRecord };

/** SPEC-011 — đăng ký tài khoản nội bộ rồi đăng nhập luôn. Giới hạn 6 user: E4-S1-T5. */
export async function registerLocal(
  deps: LocalCredentialsDeps,
  input: Credentials,
): Promise<SignedIn> {
  if (!isStrongPassword(input.password)) throw new AppError('ERR_WEAK_PASSWORD');

  const email = normalizeEmail(input.email);
  // Kiểm tra trước để khỏi tốn một lần băm Argon2 cho email đã có.
  if ((await deps.localUsers.findByEmail(email)) !== null) throw new AppError('ERR_EMAIL_TAKEN');

  const user = await deps.localUsers.createLocal({
    email,
    passwordHash: await deps.hasher.hash(input.password),
    displayName: displayNameFromEmail(email),
  });

  return startSession(deps, user.id);
}

/** SPEC-012 — mọi kiểu sai đều trả chung một lỗi, chống dò tài khoản. */
export async function signInLocal(
  deps: LocalCredentialsDeps,
  input: Credentials,
): Promise<SignedIn> {
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

  return startSession(deps, user.id);
}
