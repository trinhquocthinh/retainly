import { Button } from '@src/shared/ui/Button/Button';
import { IconCheck, IconShield } from '@src/shared/ui/Icons/Icons';

import type { AuthMode } from '../../../domain/authAlert';

import './LoginStatus.css';

/** Màn chờ 2s trước khi trình duyệt rời sang Authentik. */
export function SsoConnecting({ mode, onCancel }: { mode: AuthMode; onCancel: () => void }) {
  return (
    <div className="login-status" role="status">
      <span className="login-status__icon login-status__icon--sso">
        <IconShield size={20} />
      </span>
      <p className="text-h2">Đang mở Authentik…</p>
      <p className="login-status__hint text-small">
        {mode === 'login'
          ? 'Tiếp tục đăng nhập trên trang Authentik.'
          : 'Tiếp tục đăng ký trên trang Authentik.'}
      </p>
      <Button onClick={onCancel}>Hủy và quay lại</Button>
    </div>
  );
}

/** Chỉ cho luồng email/mật khẩu — SSO thành công thì callback về thẳng `/`. */
export function SignedIn({ mode }: { mode: AuthMode }) {
  return (
    <div className="login-status" role="status">
      <span className="login-status__icon login-status__icon--success">
        <IconCheck size={28} />
      </span>
      <p className="text-h2">
        {mode === 'login' ? 'Đăng nhập thành công!' : 'Tạo tài khoản thành công!'}
      </p>
      <p className="login-status__hint text-small">Đang mở trang học tập của bạn…</p>
      <span className="login-status__progress" aria-hidden="true" />
    </div>
  );
}
