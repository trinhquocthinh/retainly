import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router';

import { PlaceholderPage } from '@src/shared/pages/PlaceholderPage/PlaceholderPage';
import { AppShell } from '@src/shared/layout/AppShell/AppShell';
import { RequireAuth } from '@src/features/auth/presentation/components/RequireAuth/RequireAuth';

// Mỗi màn một chunk riêng: vào /login không phải tải bộ ôn tập, vào app rồi
// không phải tải lại zod/TanStack Form. Giữ bundle đầu dưới mốc 500 kB của Vite.
const LoginPage = lazy(() =>
  import('@src/features/auth/presentation/pages/LoginPage/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
);
const ReviewPage = lazy(() =>
  import('@src/features/review/presentation/pages/ReviewPage/ReviewPage').then((m) => ({
    default: m.ReviewPage,
  })),
);
const CardLibraryPage = lazy(() =>
  import('@src/features/cards/presentation/pages/CardLibraryPage/CardLibraryPage').then((m) => ({
    default: m.CardLibraryPage,
  })),
);
const CreateCardPage = lazy(() =>
  import('@src/features/cards/presentation/pages/CreateCardPage/CreateCardPage').then((m) => ({
    default: m.CreateCardPage,
  })),
);
const StatsPage = lazy(() =>
  import('@src/features/stats/presentation/pages/StatsPage/StatsPage').then((m) => ({
    default: m.StatsPage,
  })),
);
const AccountPage = lazy(() =>
  import('@src/features/auth/presentation/pages/AccountPage/AccountPage').then((m) => ({
    default: m.AccountPage,
  })),
);
const HomePage = lazy(() =>
  import('@src/features/review/presentation/pages/HomePage/HomePage').then((m) => ({
    default: m.HomePage,
  })),
);

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
