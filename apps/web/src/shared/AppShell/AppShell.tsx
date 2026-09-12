import { Link, NavLink } from 'react-router';
import type { ReactNode } from 'react';
import { IconToday, IconLibrary, IconNewCard } from '../Icons/Icons';

import './AppShell.css';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <nav className="shell__nav" aria-label="Điều hướng chính">
        <Link className="shell__brand" to="/">
          <span className="shell__mark" aria-hidden="true" />
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
