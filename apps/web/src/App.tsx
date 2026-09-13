import { Route, Routes } from 'react-router';

import { PlaceholderPage } from '@src/shared/ui/PlaceholderPage';
import { AppShell } from '@src/shared/layout/AppShell/AppShell';
import { CreateCardPage } from '@src/features/cards/presentation/CreateCardPage';
import { ReviewPage } from '@src/features/review/presentation/ReviewPage/ReviewPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Trang chủ" />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/cards" element={<PlaceholderPage title="Thư viện thẻ" />} />
        <Route path="/cards/new" element={<CreateCardPage />} />
        <Route path="/login" element={<PlaceholderPage title="Đăng nhập" />} />
        <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
      </Routes>
    </AppShell>
  );
}
