import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';

import { setUnauthorizedHandler } from '@src/shared/api/client';
import { Button } from '@src/shared/ui/Button/Button';

import { clearSession, useSession } from '../../application/useSession';
import { fetchSession } from '../../infrastructure/authApi';

import './RequireAuth.css';

/**
 * Cổng cho mọi route cần đăng nhập. Phiên hết hạn giữa chừng (API trả 401)
 * cũng quy về đây: bỏ phiên trong cache → render lại → chuyển về /login.
 */
export function RequireAuth() {
  const queryClient = useQueryClient();
  const session = useSession({ fetchSession });

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession(queryClient));
    return () => setUnauthorizedHandler(() => {});
  }, [queryClient]);

  if (session.isPending) {
    return (
      <p className="auth-gate text-small" role="status">
        Đang kiểm tra phiên đăng nhập…
      </p>
    );
  }

  if (session.isError) {
    return (
      <div className="auth-gate">
        <p className="feedback-danger text-small" role="alert">
          {session.error.message}
        </p>
        <Button onClick={() => void session.refetch()}>Thử lại</Button>
      </div>
    );
  }

  if (session.data === null) return <Navigate to="/login" replace />;

  return <Outlet />;
}
