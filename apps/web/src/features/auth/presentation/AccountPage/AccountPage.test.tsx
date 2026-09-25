import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { App } from '@src/App';
import { homeOverview } from '@src/shared/test/homeOverview';
import { renderWithProviders } from '@src/shared/test/renderWithProviders';

type Reply = { status: number; body: unknown };

function session(authMethod: 'local' | 'sso'): Reply {
  return {
    status: 200,
    body: {
      session: {
        userId: 'user-1',
        expiresAt: '2026-10-09T00:00:00.000Z',
        displayName: 'Thịnh',
        authMethod,
      },
    },
  };
}

/** Giả lập API theo "METHOD /api/..."; đường nào không khai báo thì trả 200 `{}`. */
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

function renderAccount(routes: Record<string, Reply>, authMethod: 'local' | 'sso' = 'local') {
  const fetchMock = stubApi({
    'GET /api/session': session(authMethod),
    'GET /api/home/overview': { status: 200, body: homeOverview() },
    ...routes,
  });
  renderWithProviders(<App />, { route: '/account' });
  return { fetchMock, user: userEvent.setup() };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  {
    current = 'mat-khau-cu',
    next = 'Mat-khau-moi-3',
    confirm = next,
  }: { current?: string; next?: string; confirm?: string } = {},
) {
  await user.type(await screen.findByLabelText('Mật khẩu hiện tại'), current);
  await user.type(screen.getByLabelText('Mật khẩu mới'), next);
  await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), confirm);
  await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
}

function passwordRequests(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([url]) => url === '/api/auth/password');
}

// App nạp màn Tài khoản bằng lazy(); lần nạp đầu (kèm zod, TanStack Form) có
// thể quá 1s khi cả bộ test chạy song song có coverage. Nạp sẵn để findBy* chỉ
// còn chờ API giả, không chờ biên dịch module.
beforeAll(async () => {
  await import('./AccountPage');
});

afterEach(() => vi.unstubAllGlobals());

describe('E11-S1-T2 — màn Tài khoản', () => {
  it('avatar trên topbar và tên ở sidebar dẫn tới /account', async () => {
    stubApi({
      'GET /api/session': session('local'),
      'GET /api/home/overview': { status: 200, body: homeOverview() },
    });
    renderWithProviders(<App />, { route: '/' });

    expect(await screen.findByRole('link', { name: 'Tài khoản của bạn' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(screen.getByRole('link', { name: 'Tài khoản: Thịnh' })).toHaveAttribute(
      'href',
      '/account',
    );
  });

  it('TC-076: đổi thành công — gửi đúng body, báo xong, xoá sạch form', async () => {
    const { fetchMock, user } = renderAccount({
      'POST /api/auth/password': { status: 204, body: null },
    });

    await fillAndSubmit(user);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.',
    );
    const [[, init]] = passwordRequests(fetchMock);
    expect(JSON.parse(String(init?.body))).toEqual({
      currentPassword: 'mat-khau-cu',
      newPassword: 'Mat-khau-moi-3',
    });
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveValue('');
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');
  });

  it('TC-076: sai mật khẩu hiện tại (401) báo ở đúng ô và KHÔNG bị đẩy về /login', async () => {
    const { user } = renderAccount({
      'POST /api/auth/password': {
        status: 401,
        body: {
          error: { code: 'ERR_INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' },
        },
      },
    });

    await fillAndSubmit(user);

    const current = screen.getByLabelText('Mật khẩu hiện tại');
    expect(await screen.findByText('Mật khẩu hiện tại không đúng')).toBeVisible();
    expect(current).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('heading', { name: 'Tài khoản' })).toBeVisible();

    await user.type(current, 'x');
    expect(screen.queryByText('Mật khẩu hiện tại không đúng')).not.toBeInTheDocument();
  });

  it('TC-076: mật khẩu mới yếu hoặc nhập lại lệch thì không gọi API', async () => {
    const { fetchMock, user } = renderAccount({});

    await fillAndSubmit(user, { next: 'yeu', confirm: 'khac' });

    expect(
      await screen.findByText(
        'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký hiệu',
      ),
    ).toBeVisible();
    expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeVisible();
    expect(passwordRequests(fetchMock)).toHaveLength(0);
  });

  it('quá số lần thử (429) hiện banner thông điệp của máy chủ', async () => {
    const { user } = renderAccount({
      'POST /api/auth/password': {
        status: 429,
        body: {
          error: {
            code: 'ERR_TOO_MANY_REQUESTS',
            message: 'Bạn đã thử quá nhiều lần, vui lòng đợi 15 phút rồi thử lại',
          },
        },
      },
    });

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bạn đã thử quá nhiều lần, vui lòng đợi 15 phút rồi thử lại',
    );
  });

  it('TC-076: tài khoản SSO không có form, được chỉ sang Authentik', async () => {
    renderAccount({}, 'sso');

    const panel = await screen.findByRole('region', { name: 'Đổi mật khẩu' });
    expect(panel).toHaveTextContent('mật khẩu được quản lý tại Authentik');
    expect(within(panel).queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Hồ sơ' })).toHaveTextContent('Authentik SSO');
  });
});
