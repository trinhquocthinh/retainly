import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import { Button } from '@src/shared/ui/Button/Button';
import { IconAlert, IconShield } from '@src/shared/ui/Icons/Icons';
import { Logo } from '@src/shared/ui/Logo/Logo';
import { SegmentedTabs } from '@src/shared/ui/SegmentedTabs/SegmentedTabs';

import { useLoginFlow } from '../../../application/useLoginFlow';
import { useSession } from '../../../application/useSession';
import { alertFromSsoRedirect, type AuthAlert, type AuthMode } from '../../../domain/authAlert';
import { fetchSession, redirectToSso, register, signIn } from '../../../infrastructure/authApi';
import { CredentialsForm } from '../../components/CredentialsForm/CredentialsForm';
import { SignedIn, SsoConnecting } from '../../components/LoginStatus/LoginStatus';

import './LoginPage.css';

const MODE_TABS = [
  { value: 'login', label: 'Đăng nhập' },
  { value: 'register', label: 'Đăng ký' },
] as const;

/** Màn đăng nhập và đăng ký dùng chung bố cục auth. */
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
        <LoginHero />

        <section
          className={`login__card surface-raised ${shaking.active ? 'login__card--shake' : ''}`}
          onAnimationEnd={shaking.stop}
        >
          {flow.alert ? <LoginAlert alert={flow.alert} /> : null}

          {flow.signedIn ? (
            <SignedIn mode={flow.mode} />
          ) : flow.connectingSso ? (
            <SsoConnecting mode={flow.mode} onCancel={flow.cancelSso} />
          ) : (
            <>
              <div className="login__intro">
                <h2 className="text-h2">
                  {flow.mode === 'login' ? 'Chào mừng bạn trở lại' : 'Bắt đầu cùng Retainly'}
                </h2>
                <p className="text-small">
                  {flow.mode === 'login'
                    ? 'Đăng nhập để tiếp tục với những thẻ bạn đã lưu.'
                    : 'Tạo tài khoản để lưu kiến thức và xây dựng thói quen ôn tập.'}
                </p>
              </div>
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
                {flow.mode === 'login' ? 'Đăng nhập với Authentik' : 'Đăng ký với Authentik'}
              </Button>

              <p className="login__divider text-small">
                {flow.mode === 'login' ? 'hoặc đăng nhập bằng email' : 'hoặc đăng ký bằng email'}
              </p>

              <CredentialsForm
                mode={flow.mode}
                submitting={flow.submitting}
                onSubmit={flow.submitCredentials}
                onForgotPassword={flow.showForgotPassword}
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
        Retainly · Khỏi lo brain drain, đã có Retain!
      </footer>
    </div>
  );
}

/** Giới thiệu ngắn trên mobile; mở rộng thành cột nội dung trên desktop. */
function LoginHero() {
  return (
    <header className="login__hero">
      <div className="login__brand">
        <Logo size={56} />
        <div>
          <h1 className="text-h1">Retainly</h1>
          <p className="login__tagline text-small">Khỏi lo brain drain, đã có Retain!</p>
        </div>
      </div>

      <div className="login__pitch">
        <span className="login__eyebrow text-caption-caps">Một chút mỗi ngày</span>
        <p className="text-display">
          Điều đáng học.
          <br />
          <span>Đáng để nhớ lâu.</span>
        </p>
        <p className="login__pitch-body">
          Biến điều bạn đọc thành thẻ hỏi đáp. Tự nhớ lại câu trả lời, rồi ôn theo lịch được điều
          chỉnh từ kết quả của bạn.
        </p>
        <ol className="login__steps">
          <li>
            <strong>Lưu kiến thức</strong>
            <span>Gói một ý thành một thẻ hỏi đáp.</span>
          </li>
          <li>
            <strong>Tự nhớ lại</strong>
            <span>Thử trả lời trước khi xem đáp án.</span>
          </li>
          <li>
            <strong>Ôn theo lịch</strong>
            <span>Tiếp tục với những thẻ cần ôn.</span>
          </li>
        </ol>
      </div>

      <p className="login__trust text-small">
        <IconShield />
        Dùng tài khoản Authentik hoặc đăng nhập bằng email và mật khẩu.
      </p>
    </header>
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
