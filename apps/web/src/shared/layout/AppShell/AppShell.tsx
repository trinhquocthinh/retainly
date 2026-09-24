import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { Logo } from '@src/shared/ui/Logo/Logo';
import {
  IconChart,
  IconClose,
  IconLibrary,
  IconMenu,
  IconNewCard,
  IconToday,
  IconUser,
} from '@src/shared/ui/Icons/Icons';
import { useDueCount } from '@src/features/review/application/useDueCount';
import { SidebarProgress } from '@src/features/review/presentation/TodayProgress/TodayProgress';
import { useSession, useSignOut } from '@src/features/auth/application/useSession';
import { fetchSession, signOut as signOutRequest } from '@src/features/auth/infrastructure/authApi';

import './AppShell.css';

/** Tiêu đề hiện trên topbar. Khớp danh mục màn hình ở design-criteria §5. */
const TITLE_BY_PATH: Record<string, string> = {
  '/': 'Hôm nay',
  '/review': 'Ôn tập',
  '/cards': 'Thư viện thẻ',
  '/cards/new': 'Thẻ mới',
  '/stats': 'Thống kê',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const dueCount = useDueCount();
  const signOut = useSignOut({ signOut: signOutRequest });
  const session = useSession({ fetchSession });

  // Điều hướng xong thì đóng ngăn kéo, nếu không nó che mất màn hình vừa mở.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  return (
    <div className="shell">
      <header className="shell__header">
        <button
          type="button"
          className="shell__menu"
          aria-label="Mở menu điều hướng"
          aria-controls="shell-nav"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
        >
          <IconMenu />
        </button>

        <span className="shell__page-title text-small">
          {TITLE_BY_PATH[pathname] ?? 'Retainly'}
        </span>

        <button type="button" className="shell__avatar" aria-label="Tài khoản của bạn">
          <IconUser />
        </button>
      </header>

      <div
        className="shell__scrim"
        data-open={navOpen}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <nav id="shell-nav" className="shell__nav" data-open={navOpen} aria-label="Điều hướng chính">
        <div className="shell__brand-row">
          <Link className="shell__brand" to="/">
            <Logo />
            <span className="text-h2">Retainly</span>
          </Link>
          <button
            type="button"
            className="shell__nav-close"
            aria-label="Đóng menu điều hướng"
            onClick={() => setNavOpen(false)}
          >
            <IconClose />
          </button>
        </div>

        <Link className="link-button link-button--accent shell__cta" to="/cards/new">
          <IconNewCard />
          Tạo thẻ mới
        </Link>

        <div className="shell__links">
          <NavLink to="/" end className="shell__link">
            <IconToday />
            <span className="shell__link-label">Hôm nay</span>
            {dueCount > 0 ? <span className="shell__badge">{dueCount}</span> : null}
          </NavLink>
          <NavLink to="/cards" end className="shell__link">
            <IconLibrary />
            <span className="shell__link-label">Thư viện</span>
          </NavLink>
          <NavLink to="/stats" end className="shell__link">
            <IconChart />
            <span className="shell__link-label">Thống kê</span>
          </NavLink>
        </div>

        <div className="shell__footer">
          <SidebarProgress />

          <div className="shell__user">
            <span className="shell__user-avatar icon-disc">
              <IconUser />
            </span>
            {/* Shell chỉ render sau RequireAuth nên phiên luôn có sẵn trong cache. */}
            <span className="shell__user-name text-small">{session.data?.displayName}</span>
            <button
              type="button"
              className="shell__logout text-small"
              disabled={signOut.isPending}
              onClick={() => signOut.mutate()}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      <main className="shell__main">
        <div className="shell__content">{children}</div>
      </main>
    </div>
  );
}
