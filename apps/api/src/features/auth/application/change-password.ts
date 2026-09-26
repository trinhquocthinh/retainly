import { AppError } from '../../../shared/errors';
import { DUMMY_PASSWORD_HASH } from '../domain/local-credentials';
import { isStrongPassword } from '../domain/password-policy';
import { hashSessionToken } from '../domain/session-token';
import type { LocalUserRepository, PasswordHasher } from './local-credentials';

type ChangePasswordDeps = {
  localUsers: LocalUserRepository;
  hasher: PasswordHasher;
};

type ChangePasswordInput = {
  userId: string;
  /** Token của phiên đang gửi yêu cầu — phiên duy nhất được giữ lại. */
  sessionToken: string;
  currentPassword: string;
  newPassword: string;
};

/** BR-027 — User tự đổi mật khẩu: phải nhập đúng mật khẩu hiện tại; mọi phiên khác bị huỷ. */
export async function changePassword(
  deps: ChangePasswordDeps,
  input: ChangePasswordInput,
): Promise<void> {
  // Kiểm tra rẻ trước: mật khẩu mới yếu thì khỏi tốn hai lần băm Argon2.
  if (!isStrongPassword(input.newPassword)) throw new AppError('ERR_WEAK_PASSWORD');

  const user = await deps.localUsers.findById(input.userId);

  // User SSO không có mật khẩu ở Retainly: vẫn verify với hash giả để trả
  // cùng một lỗi, cùng một thời gian như gõ sai mật khẩu hiện tại.
  const matches = await deps.hasher.verify(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    input.currentPassword,
  );

  if (user === null || user.passwordHash === null || !matches) {
    throw new AppError('ERR_INVALID_CREDENTIALS');
  }

  await deps.localUsers.replacePassword(user.id, await deps.hasher.hash(input.newPassword), {
    keepSessionTokenHash: hashSessionToken(input.sessionToken),
  });
}
