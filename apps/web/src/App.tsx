import { Outlet, Route, Routes } from 'react-router';

import { PlaceholderPage } from '@src/shared/ui/PlaceholderPage';
import { AppShell } from '@src/shared/layout/AppShell/AppShell';
import { CreateCardPage } from '@src/features/cards/presentation/CreateCardPage';
import { ReviewPage } from '@src/features/review/presentation/ReviewPage/ReviewPage';
import { CardLibraryPage } from '@src/features/cards/presentation/CardLibraryPage/CardLibraryPage';

/** Khung có sidebar + topbar. Màn Ôn tập cố tình đứng ngoài để chạy toàn màn hình. */
function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/review" element={<ReviewPage />} />

      <Route element={<ShellLayout />}>
        <Route path="/" element={<PlaceholderPage title="Trang chủ" />} />
        <Route path="/cards" element={<CardLibraryPage />} />
        <Route path="/cards/new" element={<CreateCardPage />} />
        <Route path="/login" element={<PlaceholderPage title="Đăng nhập" />} />
        <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
      </Route>
    </Routes>
  );
}
