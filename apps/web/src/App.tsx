import { Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router';

import { PlaceholderPage } from '@src/shared/pages/PlaceholderPage/PlaceholderPage';
import { AppShell } from '@src/shared/layout/AppShell/AppShell';
import { RequireAuth } from '@src/features/auth/presentation/components/RequireAuth/RequireAuth';

import {
  AccountPage,
  CardLibraryPage,
  CreateCardPage,
  HomePage,
  LoginPage,
  ReviewPage,
  StatsPage,
} from './pages';

function RouteLoading() {
  return (
    <p className="text-small" role="status">
      Đang tải…
    </p>
  );
}

/** Khung có sidebar + topbar. Màn Ôn tập cố tình đứng ngoài để chạy toàn màn hình. */
function ShellLayout() {
  return (
    <AppShell>
      {/* Suspense bên trong shell để sidebar đứng yên khi chuyển màn. */}
      <Suspense fallback={<RouteLoading />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/extra" element={<ReviewPage source="extra" />} />
          <Route path="/review/topic/:topicId" element={<ReviewPage source="topic" />} />

          <Route element={<ShellLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/cards" element={<CardLibraryPage />} />
            <Route path="/cards/new" element={<CreateCardPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
