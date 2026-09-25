import { isStrongPassword } from '@retainly/password-policy';
import { z } from 'zod';

import type { AuthMode } from './authAlert';

/**
 * Giá trị của form; `confirmPassword` chỉ dùng ở tab Đăng ký và không gửi lên API,
 * `remember` ("Duy trì đăng nhập 30 ngày") chỉ gửi ở tab Đăng nhập.
 */
export type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  remember: boolean;
};

/**
 * Chặt hơn format `email` của API một chút (zod đòi tên miền cấp cao ≥ 2 chữ cái),
 * nên cái gì qua được đây thì chắc chắn qua được API — không còn ERR_BAD_REQUEST.
 */
const email = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email')
  .pipe(z.email('Email chưa đúng định dạng, ví dụ ban@vidu.com'));

export const WEAK_PASSWORD_MESSAGE =
  'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký hiệu';

export const PASSWORD_MISMATCH_MESSAGE = 'Mật khẩu nhập lại không khớp';

const requiredPassword = z.string().min(1, 'Vui lòng nhập mật khẩu');

/** Đăng nhập không áp luật mạnh: tài khoản tạo theo luật cũ vẫn phải vào được. */
const loginSchema = z.object({
  email,
  password: requiredPassword,
  confirmPassword: z.string(),
  remember: z.boolean(),
});

const registerSchema = z
  .object({
    email,
    password: requiredPassword.refine(isStrongPassword, WEAK_PASSWORD_MESSAGE),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    remember: z.boolean(),
  })
  // Gắn lỗi vào ô nhập lại để hiện đúng chỗ, không phải lỗi chung của form.
  .refine((values) => values.password === values.confirmPassword, {
    message: PASSWORD_MISMATCH_MESSAGE,
    path: ['confirmPassword'],
  });

export function credentialsSchema(mode: AuthMode) {
  return mode === 'login' ? loginSchema : registerSchema;
}
