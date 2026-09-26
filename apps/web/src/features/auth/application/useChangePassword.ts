import { useMutation } from '@tanstack/react-query';

import type { PasswordChange } from '../domain/session';

/** Cổng đổi mật khẩu. Hiện thực thật do page container tiêm vào. */
type ChangePasswordPort = (change: PasswordChange) => Promise<void>;

/**
 * BR-027 — đổi mật khẩu. Không cần làm mới cache nào: phiên đang dùng được máy
 * chủ giữ nguyên, chỉ các thiết bị khác bị đăng xuất.
 */
export function useChangePassword(deps: { changePassword: ChangePasswordPort }) {
  return useMutation({ mutationFn: deps.changePassword });
}
