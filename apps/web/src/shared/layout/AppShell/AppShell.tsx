import { Link, NavLink } from 'react-router';
import type { ReactNode } from 'react';
import { Logo } from '@src/shared/ui/Logo/Logo';
import { IconToday, IconLibrary, IconNewCard } from '@src/shared/ui/Icons/Icons';

import './AppShell.css';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <nav className="shell__nav" aria-label="Điều hướng chính">
        <Link className="shell__brand" to="/">
          <Logo />
          <span className="text-h2">Retainly</span>
        </Link>

        <div className="shell__links">
          <NavLink to="/" end className="shell__link">
            <IconToday />
            Hôm nay
          </NavLink>
          <NavLink to="/cards" end className="shell__link">
            <IconLibrary />
            Thư viện
          </NavLink>
          <NavLink to="/cards/new" className="shell__link shell__link--cta">
            <IconNewCard />
            Tạo thẻ
          </NavLink>
        </div>
      </nav>

      <main className="shell__main">
        <div className="shell__content">{children}</div>
      </main>
    </div>
  );
}
