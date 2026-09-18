import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { alertFromError, type AuthAlert, type AuthMode } from '../domain/authAlert';
import type { Credentials } from '../domain/session';
import { forgetCachedSession } from './useSession';

/** Cổng xác thực. Hiện thực thật do page container tiêm vào. */
type LoginPorts = {
  signIn: (credentials: Credentials) => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  redirectToSso: () => void;
};

/** Màn "Đang kết nối tới Authentik" đứng 2s trước khi rời trang — đủ để bấm Huỷ. */
const SSO_REDIRECT_DELAY_MS = 2000;
/** Màn "Xác thực thành công" của luồng email/mật khẩu trước khi vào trang chủ. */
const SIGNED_IN_DELAY_MS = 1200;

/**
 * Máy trạng thái của màn đăng nhập: form ↔ chờ SSO, form → thành công → `/`.
 * SSO thành công không đi qua đây: callback của API chuyển thẳng về `/`.
 */
export function useLoginFlow(deps: LoginPorts, initialAlert: AuthAlert | null) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [alert, setAlert] = useState(initialAlert);
  const [connectingSso, setConnectingSso] = useState(false);

  const submit = useMutation({
    mutationFn: ({ mode, credentials }: { mode: AuthMode; credentials: Credentials }) =>
      mode === 'login' ? deps.signIn(credentials) : deps.register(credentials),
    onMutate: () => setAlert(null),
    onError: (error, { mode }) => setAlert(alertFromError(error, mode)),
  });

  const signedIn = submit.isSuccess;

  // Chỉ bỏ cache phiên khi rời màn: làm sớm thì LoginPage đọc lại thấy đã đăng
  // nhập và chuyển trang ngay, người dùng không kịp thấy màn thành công.
  useEffect(() => {
    if (!signedIn) return;

    const timer = setTimeout(() => {
      forgetCachedSession(queryClient);
      void navigate('/', { replace: true });
    }, SIGNED_IN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [signedIn, queryClient, navigate]);

  useEffect(() => {
    if (!connectingSso) return;

    const timer = setTimeout(deps.redirectToSso, SSO_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [connectingSso, deps.redirectToSso]);

  // Bấm Back từ Authentik: trình duyệt có thể khôi phục trang từ bfcache
  // nguyên trạng màn chờ, nên đưa về form.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setConnectingSso(false);
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  return {
    mode,
    alert,
    connectingSso,
    signedIn,
    submitting: submit.isPending,
    changeMode: (next: AuthMode) => {
      setMode(next);
      setAlert(null);
    },
    startSso: () => {
      setAlert(null);
      setConnectingSso(true);
    },
    cancelSso: () => setConnectingSso(false),
    submitCredentials: (credentials: Credentials) => submit.mutate({ mode, credentials }),
  };
}
