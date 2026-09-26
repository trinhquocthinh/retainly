import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Hai file font Inter màn nào cũng dùng; không gồm latin-ext (xem src/fonts.css). */
const INTER_FONT_FILE = /\/inter-(latin|vietnamese)-wght-normal-[\w-]+\.woff2$/;

/**
 * Chèn `<link rel="preload">` cho font vào index.html lúc build (NFR-1, E12-S1-T2b).
 * Không preload thì trình duyệt chỉ thấy font sau HTML → index.js → chunk màn → render,
 * nên LCP (dòng chữ) chờ font ở mắt xích thứ tư. Tên file có hash nên phải đọc từ bundle.
 */
function preloadFonts(): Plugin {
  return {
    name: 'retainly:preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (_html, { bundle }) =>
        Object.keys(bundle ?? {})
          .filter((file) => INTER_FONT_FILE.test(`/${file}`))
          .map((file) => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'font',
              type: 'font/woff2',
              href: `/${file}`,
              crossorigin: '',
            },
            injectTo: 'head',
          })),
    },
  };
}

export default defineConfig({
  plugins: [react(), preloadFonts()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3100' },
  },
  resolve: {
    alias: {
      '@src': fileURLToPath(new URL('./src', import.meta.url)),
      // Luật mật khẩu SPEC-011 chỉ có một bản, nằm bên API (nợ #14).
      '@retainly/password-policy': fileURLToPath(
        new URL('../api/src/features/auth/domain/password-policy.ts', import.meta.url),
      ),
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
