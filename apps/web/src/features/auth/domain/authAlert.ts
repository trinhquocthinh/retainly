import { ApiError } from '@src/shared/api/client';

export type AuthMode = 'login' | 'register';

export type AuthAlert = {
  tone: 'danger' | 'warning';
  title: string;
  message: string;
};

/** Hết chỗ không phải lỗi của người dùng nên dùng tông cảnh báo, không phải tông lỗi. */
const USER_LIMIT_ALERT: AuthAlert = {
  tone: 'warning',
  title: 'Retainly đã đủ số tài khoản',
  message: 'Không thể tạo thêm tài khoản mới. Liên hệ chủ dự án nếu bạn cần một chỗ.',
};

const SSO_FAILED_ALERT: AuthAlert = {
  tone: 'danger',
  title: 'Đăng nhập SSO không thành công',
  message: 'Không hoàn tất được xác thực với Authentik. Vui lòng thử lại.',
};

/** Đọc `?error=` do callback SSO của API gắn khi chuyển hướng về /login. */
export function alertFromSsoRedirect(reason: string | null): AuthAlert | null {
  if (reason === 'user_limit') return USER_LIMIT_ALERT;
  if (reason === 'sso_failed') return SSO_FAILED_ALERT;
  return null;
}

/** Thông điệp máy chủ đã chuẩn hoá (chống dò tài khoản), UI chỉ thêm tiêu đề. */
export function alertFromError(error: unknown, mode: AuthMode): AuthAlert {
  if (error instanceof ApiError && error.code === 'ERR_USER_LIMIT_REACHED') return USER_LIMIT_ALERT;

  return {
    tone: 'danger',
    title: mode === 'login' ? 'Đăng nhập không thành công' : 'Đăng ký không thành công',
    message: error instanceof Error ? error.message : 'Có lỗi xảy ra, thử lại sau',
  };
}
