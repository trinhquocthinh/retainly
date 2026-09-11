import { Route, Routes } from 'react-router';

import { PlaceholderPage } from './shared/PlaceholderPage';

export function App() {
  return (
    <main className="app-container">
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Trang chủ" />} />
        <Route path="/review" element={<PlaceholderPage title="Ôn tập" />} />
        <Route path="/cards" element={<PlaceholderPage title="Thư viện thẻ" />} />
        <Route path="/cards/new" element={<PlaceholderPage title="Tạo thẻ" />} />
        <Route path="/login" element={<PlaceholderPage title="Đăng nhập" />} />
        <Route path="*" element={<PlaceholderPage title="Không tìm thấy trang" />} />
      </Routes>
    </main>
  );
}
