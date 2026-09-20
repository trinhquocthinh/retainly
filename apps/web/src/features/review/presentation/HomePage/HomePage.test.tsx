import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { HomePage } from './HomePage';

type Reply = {
  status: number;
  body: unknown;
};

function stubHomeApi(routes: Record<string, Reply>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const reply = routes[url];

      if (!reply) throw new TypeError(`Không có route giả cho ${url}`);

      return {
        ok: reply.status < 400,
        status: reply.status,
        json: async () => reply.body,
      };
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('E5-S1-T3 — Trang chủ', () => {
  it('hiển thị số thẻ đến hạn, streak và CTA bắt đầu ôn', async () => {
    stubHomeApi({
      '/api/cards/due': {
        status: 200,
        body: {
          dueCount: 12,
          dueCards: [],
        },
      },
      '/api/streak': {
        status: 200,
        body: {
          currentStreak: 7,
        },
      },
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Hôm nay' })).toBeVisible();
    expect(screen.getByText('12')).toBeVisible();
    expect(screen.getByLabelText('Chuỗi 7 ngày')).toBeVisible();
    expect(screen.getByRole('link', { name: /Bắt đầu ôn tập/ })).toHaveAttribute('href', '/review');
  });

  it('không có thẻ đến hạn thì dẫn sang tạo thẻ', async () => {
    stubHomeApi({
      '/api/cards/due': {
        status: 200,
        body: {
          dueCount: 0,
          dueCards: [],
        },
      },
      '/api/streak': {
        status: 200,
        body: {
          currentStreak: 0,
        },
      },
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Bạn đã hoàn thành hôm nay')).toBeVisible();
    expect(screen.getByRole('link', { name: /Tạo thẻ mới/ })).toHaveAttribute('href', '/cards/new');
  });

  it('API lỗi thì hiện trạng thái thử lại thay vì số liệu giả', async () => {
    stubHomeApi({
      '/api/cards/due': {
        status: 503,
        body: {
          error: {
            code: 'ERR_INTERNAL',
            message: 'Máy chủ chưa sẵn sàng',
          },
        },
      },
      '/api/streak': {
        status: 200,
        body: {
          currentStreak: 7,
        },
      },
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được trang Hôm nay');
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  });
});
