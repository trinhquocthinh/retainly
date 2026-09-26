import {
  generateTemporaryPassword,
  normalizeEmail,
  type RandomInt,
} from '../domain/local-credentials';
import type { LocalUserRepository, PasswordHasher } from './local-credentials';

type ResetPasswordDeps = {
  localUsers: LocalUserRepository;
  hasher: PasswordHasher;
  randomInt: RandomInt;
};

export type ResetPasswordResult =
  { status: 'reset'; temporaryPassword: string } | { status: 'not-local' };

/** BR-027 — quản trị viên đặt lại mật khẩu tài khoản nội bộ: cấp mật khẩu tạm, huỷ mọi phiên. */
export async function resetLocalPassword(
  deps: ResetPasswordDeps,
  email: string,
): Promise<ResetPasswordResult> {
  const user = await deps.localUsers.findByEmail(normalizeEmail(email));
  // User SSO không có email nên không bao giờ khớp: mật khẩu của họ nằm ở Authentik.
  if (user === null || user.passwordHash === null) return { status: 'not-local' };

  const temporaryPassword = generateTemporaryPassword(deps.randomInt);
  await deps.localUsers.replacePassword(user.id, await deps.hasher.hash(temporaryPassword));

  return { status: 'reset', temporaryPassword };
}
