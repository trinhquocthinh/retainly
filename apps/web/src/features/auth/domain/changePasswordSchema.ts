import { isStrongPassword } from '@retainly/password-policy';
import { z } from 'zod/mini';

import { ApiError } from '@src/shared/api/client';

import { PASSWORD_MISMATCH_MESSAGE, WEAK_PASSWORD_MESSAGE } from './credentialsSchema';

/** Giá trị form đổi mật khẩu; `confirmPassword` chỉ để kiểm và không gửi lên API. */
export type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const WRONG_CURRENT_PASSWORD_MESSAGE = 'Mật khẩu hiện tại không đúng';

/**
 * Mật khẩu hiện tại chỉ cần có: tài khoản tạo theo luật cũ hay vừa nhận mật
 * khẩu tạm vẫn phải đổi được. Mật khẩu mới thì áp đủ SPEC-011.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().check(z.minLength(1, 'Vui lòng nhập mật khẩu hiện tại')),
    newPassword: z
      .string()
      .check(
        z.minLength(1, 'Vui lòng nhập mật khẩu mới'),
        z.refine(isStrongPassword, WEAK_PASSWORD_MESSAGE),
      ),
    confirmPassword: z.string().check(z.minLength(1, 'Vui lòng nhập lại mật khẩu mới')),
  })
  .check(
    z.refine((values) => values.newPassword === values.confirmPassword, {
      message: PASSWORD_MISMATCH_MESSAGE,
      path: ['confirmPassword'],
    }),
  );

/**
 * Máy chủ trả ERR_INVALID_CREDENTIALS khi mật khẩu hiện tại sai — lỗi của một ô,
 * gắn vào ô đó thay vì banner. Thông điệp máy chủ ("Email hoặc mật khẩu...") là
 * của màn đăng nhập nên UI dùng câu riêng.
 */
export function isWrongCurrentPassword(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'ERR_INVALID_CREDENTIALS';
}
