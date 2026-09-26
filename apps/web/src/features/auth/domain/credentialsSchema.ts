import { isStrongPassword } from '@retainly/password-policy';
import { z } from 'zod/mini';

import type { AuthMode } from './authAlert';

/**
 * Giá trị của form; `displayName` ("Họ và tên") chỉ gửi ở tab Đăng ký, `confirmPassword`
 * chỉ dùng ở tab Đăng ký và không gửi lên API, `remember` ("Duy trì đăng nhập 30 ngày")
 * chỉ gửi ở tab Đăng nhập.
 */
export type AuthFormValues = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  remember: boolean;
};

/**
 * Chặt hơn format `email` của API một chút (zod đòi tên miền cấp cao ≥ 2 chữ cái),
 * nên cái gì qua được đây thì chắc chắn qua được API — không còn ERR_BAD_REQUEST.
 */
const email = z.pipe(
  z.string().check(z.trim(), z.minLength(1, 'Vui lòng nhập email')),
  z.email('Email chưa đúng định dạng, ví dụ ban@vidu.com'),
);

export const WEAK_PASSWORD_MESSAGE =
  'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký hiệu';

export const PASSWORD_MISMATCH_MESSAGE = 'Mật khẩu nhập lại không khớp';

/** Khớp `maxLength` của `POST /api/auth/register` (US-019). */
export const DISPLAY_NAME_MAX_LENGTH = 50;

// API cho bỏ trống (client cũ), nhưng form đòi nhập để tên hiển thị không phải phần trước @.
const displayName = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Vui lòng nhập họ và tên'),
    z.maxLength(DISPLAY_NAME_MAX_LENGTH, `Họ và tên tối đa ${DISPLAY_NAME_MAX_LENGTH} ký tự`),
  );

const requiredPassword = z.string().check(z.minLength(1, 'Vui lòng nhập mật khẩu'));

/** Đăng nhập không áp luật mạnh: tài khoản tạo theo luật cũ vẫn phải vào được. */
const loginSchema = z.object({
  displayName: z.string(),
  email,
  password: requiredPassword,
  confirmPassword: z.string(),
  remember: z.boolean(),
});

const registerSchema = z
  .object({
    displayName,
    email,
    password: requiredPassword.check(z.refine(isStrongPassword, WEAK_PASSWORD_MESSAGE)),
    confirmPassword: z.string().check(z.minLength(1, 'Vui lòng nhập lại mật khẩu')),
    remember: z.boolean(),
  })
  // Gắn lỗi vào ô nhập lại để hiện đúng chỗ, không phải lỗi chung của form.
  .check(
    z.refine((values) => values.password === values.confirmPassword, {
      message: PASSWORD_MISMATCH_MESSAGE,
      path: ['confirmPassword'],
    }),
  );

export function credentialsSchema(mode: AuthMode) {
  return mode === 'login' ? loginSchema : registerSchema;
}
