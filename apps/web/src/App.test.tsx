import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { App } from './App';

const SESSION = {
  userId: 'user-1',
  expiresAt: '2026-10-02T00:00:00.000Z',
  displayName: 'Thịnh',
};
const EMPTY_LIBRARY = {
  items: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
};

type Reply = { status: number; body: unknown };

const UNAUTHORIZED: Reply = {
  status: 401,
  body: { error: { code: 'ERR_UNAUTHORIZED', message: 'Vui lòng đăng nhập lại' } },
};

const SIGNED_IN = { 'GET /api/session': { status: 200, body: { session: SESSION } } };

/** Giả lập API theo đường dẫn (bỏ query); đường nào không khai báo thì trả 200 `{}`. */
function stubApi(routes: Record<string, Reply>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const reply = routes[`${init?.method ?? 'GET'} ${url.split('?')[0]}`] ?? {
      status: 200,
      body: {},
    };
    return Promise.resolve({
      ok: reply.status < 400,
      status: reply.status,
      json: async () => reply.body,
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  renderWithProviders(<App />, { route: path });
}

function findSsoButton() {
  return screen.findByRole('button', { name: 'Đăng nhập với Authentik SSO' });
}

afterEach(() => vi.unstubAllGlobals());

describe('E0-S2-T4 — khung định tuyến', () => {
  it.each([
    ['/', 'Hôm nay'],
    ['/cards', 'Thư viện thẻ'],
    ['/cards/new', 'Thẻ mới'],
    ['/stats', 'Thống kê & Hiệu quả ghi nhớ'],
  ])('route %s render màn hình "%s"', async (path, title) => {
    stubApi({
      ...SIGNED_IN,
      'GET /api/cards': { status: 200, body: EMPTY_LIBRARY },
      'GET /api/topics/forget-rate': { status: 200, body: { topics: [] } },
    });
    renderAt(path);
    expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
  });

  it('đường dẫn lạ rơi vào màn hình không tìm thấy', async () => {
    stubApi(SIGNED_IN);
    renderAt('/duong-dan-khong-ton-tai');
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeTruthy();
  });
});

describe('E4-S1-T6 — chặn truy cập khi chưa đăng nhập', () => {
  it('sidebar có lối vào màn Thống kê', async () => {
    stubApi(SIGNED_IN);
    renderAt('/');

    expect(await screen.findByRole('link', { name: 'Thống kê' })).toHaveAttribute('href', '/stats');
  });

  it.each(['/login', '/', '/cards', '/review', '/stats'])(
    'chưa có phiên thì %s hiện màn đăng nhập',
    async (path) => {
      stubApi({ 'GET /api/session': UNAUTHORIZED });
      renderAt(path);
      expect(await findSsoButton()).toBeVisible();
    },
  );

  it('phiên hết hạn giữa chừng (API nghiệp vụ trả 401) thì về /login', async () => {
    stubApi({ ...SIGNED_IN, 'GET /api/cards': UNAUTHORIZED });
    renderAt('/cards');
    expect(await findSsoButton()).toBeVisible();
  });

  it('sidebar hiện tên hiển thị của người đang đăng nhập', async () => {
    stubApi(SIGNED_IN);
    renderAt('/');
    expect(await screen.findByText('Thịnh')).toBeVisible();
  });

  it('đăng xuất gọi API rồi về /login', async () => {
    const fetchMock = stubApi({
      ...SIGNED_IN,
      'POST /api/auth/logout': { status: 204, body: null },
    });
    renderAt('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }));

    expect(await findSsoButton()).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/logout')).toBe(true);
  });
});
