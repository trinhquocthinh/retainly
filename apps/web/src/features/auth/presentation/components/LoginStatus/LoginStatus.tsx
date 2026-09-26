import { Button } from '@src/shared/ui/Button/Button';
import { IconCheck, IconShield } from '@src/shared/ui/Icons/Icons';

import './LoginStatus.css';

/** Màn chờ 2s trước khi trình duyệt rời sang Authentik. */
export function SsoConnecting({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="login-status" role="status">
      <span className="login-status__icon login-status__icon--sso">
        <IconShield size={20} />
      </span>
      <p className="text-h2">Đang kết nối tới Authentik SSO…</p>
      <p className="login-status__hint text-small">Đang mở cổng xác thực an toàn OIDC.</p>
      <Button onClick={onCancel}>Hủy và quay lại</Button>
    </div>
  );
}

/** Chỉ cho luồng email/mật khẩu — SSO thành công thì callback về thẳng `/`. */
export function SignedIn() {
  return (
    <div className="login-status" role="status">
      <span className="login-status__icon login-status__icon--success">
        <IconCheck size={28} />
      </span>
      <p className="text-h2">Xác thực thành công!</p>
      <p className="login-status__hint text-small">Đang chuyển tới không gian học tập Retainly…</p>
      <span className="login-status__progress" aria-hidden="true" />
    </div>
  );
}
