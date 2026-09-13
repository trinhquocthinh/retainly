import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkError } from '@src/shared/api/client';
import { App } from './App';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử #root trong index.html');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Chỉ thử lại khi không tới được máy chủ. Lỗi nghiệp vụ thử lại là vô nghĩa.
      retry: (soLan, error) => error instanceof NetworkError && soLan < 2,
      staleTime: 30_000,
    },
    mutations: { retry: false },
  },
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
