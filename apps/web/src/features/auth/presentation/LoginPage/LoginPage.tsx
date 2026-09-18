import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import { Button } from '@src/shared/ui/Button/Button';
import { IconAlert, IconShield } from '@src/shared/ui/Icons/Icons';
import { Logo } from '@src/shared/ui/Logo/Logo';
import { SegmentedTabs } from '@src/shared/ui/SegmentedTabs/SegmentedTabs';

import { useLoginFlow } from '../../application/useLoginFlow';
import { useSession } from '../../application/useSession';
import { alertFromSsoRedirect, type AuthAlert, type AuthMode } from '../../domain/authAlert';
import { fetchSession, redirectToSso, register, signIn } from '../../infrastructure/authApi';
import { CredentialsForm } from './CredentialsForm';
import { SignedIn, SsoConnecting } from './LoginStatus';

import './LoginPage.css';

const MODE_TABS = [
  { value: 'login', label: 'Đăng nhập' },
  { value: 'register', label: 'Đăng ký' },
] as const;

/** Màn `/login` — design `designs/v0.1/login`, design-criteria §5. */
export function LoginPage() {
  const [searchParams] = useSearchParams();
  const session = useSession({ fetchSession });
  const flow = useLoginFlow(
    { signIn, register, redirectToSso },
    alertFromSsoRedirect(searchParams.get('error')),
  );
  const shaking = useShakeOnError(flow.alert);

  // Đã có phiên thì không có gì để làm ở đây. Ngoại lệ: vừa đăng nhập xong
  // đang đứng ở màn thành công, useLoginFlow tự chuyển trang sau đó.
  if (session.data && !flow.signedIn) return <Navigate to="/" replace />;

  const otherMode: AuthMode = flow.mode === 'login' ? 'register' : 'login';

  return (
    <div className="login">
      <main className="login__main">
        <header className="login__brand">
          <Logo size={48} />
          <h1 className="text-h1">Retainly</h1>
          <p className="login__tagline">Đọc rồi nhớ. Ôn đúng lúc sắp quên.</p>
        </header>

        <section
          className={`login__card surface-raised ${shaking.active ? 'login__card--shake' : ''}`}
          onAnimationEnd={shaking.stop}
        >
          {flow.alert ? <LoginAlert alert={flow.alert} /> : null}

          {flow.signedIn ? (
            <SignedIn />
          ) : flow.connectingSso ? (
            <SsoConnecting onCancel={flow.cancelSso} />
          ) : (
            <>
              <SegmentedTabs
                label="Cách vào Retainly"
                tabs={MODE_TABS}
                value={flow.mode}
                onChange={flow.changeMode}
              />

              <Button onClick={flow.startSso}>
                <span className="login__sso-icon">
                  <IconShield />
                </span>
                Đăng nhập với Authentik SSO
              </Button>

              <p className="login__divider text-small">
                {flow.mode === 'login' ? 'hoặc đăng nhập bằng email' : 'hoặc đăng ký bằng email'}
              </p>

              <CredentialsForm
                mode={flow.mode}
                submitting={flow.submitting}
                onSubmit={flow.submitCredentials}
              />

              <p className="login__switch text-small">
                {flow.mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                <button
                  type="button"
                  className="login__link"
                  onClick={() => flow.changeMode(otherMode)}
                >
                  {otherMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              </p>
            </>
          )}
        </section>
      </main>

      <footer className="login__footer text-caption">
        Retainly v0.1 · Hệ thống lặp lại ngắt quãng thuật toán FSRS
      </footer>
    </div>
  );
}

function LoginAlert({ alert }: { alert: AuthAlert }) {
  return (
    <div className="login-alert text-small" data-tone={alert.tone} role="alert">
      <IconAlert />
      <p>
        <strong>{alert.title}:</strong> {alert.message}
      </p>
    </div>
  );
}

/** Rung card mỗi lần có lỗi mới (không rung với cảnh báo hết chỗ). */
function useShakeOnError(alert: AuthAlert | null) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (alert?.tone === 'danger') setActive(true);
  }, [alert]);

  return { active, stop: () => setActive(false) };
}
