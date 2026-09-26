import { IconShield, IconUser } from '@src/shared/ui/Icons/Icons';

import { useSession } from '../../../application/useSession';
import { fetchSession } from '../../../infrastructure/authApi';
import { ChangePasswordForm } from '../../components/ChangePasswordForm/ChangePasswordForm';

import './AccountPage.css';

const AUTH_METHOD_LABEL = {
  local: 'Email và mật khẩu',
  sso: 'Authentik',
} as const;

/** Màn Tài khoản: hồ sơ đăng nhập và đổi mật khẩu (BR-027). */
export function AccountPage() {
  // Màn nằm sau RequireAuth nên phiên luôn có sẵn trong cache.
  const session = useSession({ fetchSession }).data;
  if (!session) return null;

  return (
    <div className="account">
      <header className="account__heading">
        <h1 className="text-h1">Tài khoản</h1>
        <p className="account__muted text-small">Thông tin cá nhân và cách bạn đăng nhập.</p>
      </header>

      <section className="account__panel surface-panel" aria-labelledby="account-profile">
        <h2 id="account-profile" className="account__title text-h2">
          <span className="icon-disc" aria-hidden="true">
            <IconUser size={18} />
          </span>
          Hồ sơ
        </h2>
        <dl className="account__facts">
          <div>
            <dt className="account__muted text-small">Tên hiển thị</dt>
            <dd>{session.displayName}</dd>
          </div>
          <div>
            <dt className="account__muted text-small">Cách đăng nhập</dt>
            <dd>{AUTH_METHOD_LABEL[session.authMethod]}</dd>
          </div>
        </dl>
      </section>

      <section className="account__panel surface-panel" aria-labelledby="account-password">
        <h2 id="account-password" className="account__title text-h2">
          <span className="icon-disc" aria-hidden="true">
            <IconShield size={18} />
          </span>
          Đổi mật khẩu
        </h2>

        {session.authMethod === 'local' ? (
          <>
            <p className="account__muted text-small">
              Sau khi đổi, tài khoản sẽ được đăng xuất khỏi các thiết bị khác. Bạn vẫn tiếp tục dùng
              Retainly trên thiết bị này.
            </p>
            <ChangePasswordForm />
          </>
        ) : (
          <p className="account__muted text-small">
            Mật khẩu của tài khoản này được quản lý trên Authentik. Nếu quên mật khẩu, hãy liên hệ
            quản trị viên để nhận đường dẫn khôi phục.
          </p>
        )}
      </section>
    </div>
  );
}
