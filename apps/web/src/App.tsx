import { Route, Routes } from 'react-router';

import { PlaceholderPage } from './shared/PlaceholderPage';
import { AppShell } from './shared/AppShell/AppShell';
import { CreateCardPage } from './features/cards/CreateCardPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Trang chủ" />} />
        <Route path="/review" element={<PlaceholderPage title="Ôn tập" />} />
        <Route path="/cards" element={<PlaceholderPage title="Thư viện thẻ" />} />
        <Route path="/cards/new" element={<CreateCardPage />} />
        <Route path="/login" element={<PlaceholderPage title="Đăng nhập" />} />
        <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
      </Routes>
    </AppShell>
  );
}
