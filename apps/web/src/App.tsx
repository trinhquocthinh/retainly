import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router';

import { PlaceholderPage } from '@src/shared/ui/PlaceholderPage';
import { AppShell } from '@src/shared/layout/AppShell/AppShell';
import { RequireAuth } from '@src/features/auth/presentation/RequireAuth/RequireAuth';

// Mỗi màn một chunk riêng: vào /login không phải tải bộ ôn tập, vào app rồi
// không phải tải lại zod/TanStack Form. Giữ bundle đầu dưới mốc 500 kB của Vite.
const LoginPage = lazy(() =>
  import('@src/features/auth/presentation/LoginPage/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
);
const ReviewPage = lazy(() =>
  import('@src/features/review/presentation/ReviewPage/ReviewPage').then((m) => ({
    default: m.ReviewPage,
  })),
);
const CardLibraryPage = lazy(() =>
  import('@src/features/cards/presentation/CardLibraryPage/CardLibraryPage').then((m) => ({
    default: m.CardLibraryPage,
  })),
);
const CreateCardPage = lazy(() =>
  import('@src/features/cards/presentation/CreateCardPage').then((m) => ({
    default: m.CreateCardPage,
  })),
);
const HomePage = lazy(() =>
  import('@src/features/review/presentation/HomePage/HomePage').then((m) => ({
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

          <Route element={<ShellLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/cards" element={<CardLibraryPage />} />
            <Route path="/cards/new" element={<CreateCardPage />} />
            <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
