import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@src/shared/test/renderWithProviders';

import { redirectToSso } from '../../infrastructure/authApi';
import { LoginPage } from './LoginPage';

// Rời trang thật sang Authentik thì jsdom không làm được — chỉ kiểm tra có gọi.
vi.mock('../../infrastructure/authApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../infrastructure/authApi')>()),
  redirectToSso: vi.fn(),
}));

const SESSION = { userId: 'user-1', expiresAt: '2026-10-02T00:00:00.000Z' };

type Reply = { status: number; body: unknown };

function unauthorized(code = 'ERR_UNAUTHORIZED', message = 'Vui lòng đăng nhập lại'): Reply {
  return { status: 401, body: { error: { code, message } } };
}

function apiError(status: number, code: string, message: string): Reply {
  return { status, body: { error: { code, message } } };
}

/** Mặc định chưa đăng nhập; `routes` ghi đè theo "METHOD /api/...". */
function stubApi(routes: Record<string, Reply> = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const reply = routes[`${init?.method ?? 'GET'} ${url}`] ?? unauthorized();
    return Promise.resolve({
      ok: reply.status < 400,
      status: reply.status,
      json: async () => reply.body,
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderLogin(route = '/login') {
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Trang chủ</h1>} />
    </Routes>,
    { route },
  );
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

async function submitCredentials(
  user: ReturnType<typeof userEvent.setup>,
  {
    mode,
    email,
    password,
    confirmPassword = password,
  }: { mode: 'login' | 'register'; email: string; password: string; confirmPassword?: string },
) {
  if (mode === 'register') await user.click(screen.getByRole('tab', { name: 'Đăng ký' }));
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Mật khẩu'), password);
  if (mode === 'register') {
    await user.type(screen.getByLabelText('Nhập lại mật khẩu'), confirmPassword);
  }
  await user.click(
    screen.getByRole('button', { name: mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản mới' }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.mocked(redirectToSso).mockClear();
});

describe('E4-S1-T6 — đăng nhập email/mật khẩu', () => {
  it('đúng thông tin: hiện màn thành công rồi vào trang chủ', async () => {
    const fetchMock = stubApi({
      'POST /api/auth/login': { status: 200, body: { session: SESSION } },
    });
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'login',
      email: 'learner@retainly.app',
      password: 'mat-khau-dung',
    });

    expect(await screen.findByText('Xác thực thành công!')).toBeVisible();
    const login = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login');
    expect(JSON.parse(String(login?.[1]?.body))).toEqual({
      email: 'learner@retainly.app',
      password: 'mat-khau-dung',
    });

    await act(() => vi.advanceTimersByTimeAsync(1200));
    expect(screen.getByRole('heading', { name: 'Trang chủ' })).toBeVisible();
  });

  it('TC-035: sai mật khẩu hiện thông báo chuẩn hoá của máy chủ, vẫn ở form', async () => {
    stubApi({
      'POST /api/auth/login': unauthorized(
        'ERR_INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      ),
    });
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'login',
      email: 'learner@retainly.app',
      password: 'sai-mat-khau',
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Đăng nhập không thành công');
    expect(alert).toHaveTextContent('Email hoặc mật khẩu không đúng');
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });

  it('TC-075: "Quên mật khẩu?" hướng dẫn liên hệ quản trị viên, không gọi API', async () => {
    const fetchMock = stubApi();
    const user = renderLogin();
    await screen.findByRole('button', { name: 'Đăng nhập' });
    const callsBefore = fetchMock.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Quên mật khẩu');
    expect(alert).toHaveTextContent('Liên hệ quản trị viên Retainly để được cấp mật khẩu tạm');
    expect(fetchMock).toHaveBeenCalledTimes(callsBefore);

    await user.click(screen.getByRole('tab', { name: 'Đăng ký' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Quên mật khẩu?' })).toBeNull();
  });

  it('đã có phiên thì vào thẳng trang chủ', async () => {
    stubApi({ 'GET /api/session': { status: 200, body: { session: SESSION } } });
    renderLogin();

    expect(await screen.findByRole('heading', { name: 'Trang chủ' })).toBeVisible();
  });
});

describe('E4-S1-T6 — đăng ký tài khoản nội bộ', () => {
  it('thanh độ mạnh 4 mức theo 5 tiêu chuẩn, chưa gõ thì "Chưa nhập"', async () => {
    stubApi();
    const user = renderLogin();

    await user.click(screen.getByRole('tab', { name: 'Đăng ký' }));
    const password = screen.getByLabelText('Mật khẩu');
    const rule = (label: string) => screen.getByText(label, { exact: false }).closest('li');

    expect(screen.getByText('Chưa nhập')).toBeVisible();
    expect(screen.queryByText('Yếu')).not.toBeInTheDocument();

    await user.type(password, 'abc1234');
    expect(screen.getByText('Yếu')).toBeVisible();

    await user.type(password, '5');
    expect(screen.getByText('Trung bình')).toBeVisible();
    expect(rule('Ít nhất 8 ký tự')).toHaveAttribute('data-passed', 'true');
    expect(rule('Chữ hoa')).toHaveAttribute('data-passed', 'false');

    await user.clear(password);
    await user.type(password, 'Abc12345');
    expect(screen.getByText('Khá mạnh')).toBeVisible();

    await user.type(password, '!');
    expect(screen.getByText('Rất mạnh')).toBeVisible();
  });

  it('mật khẩu nhập lại lệch thì báo ngay dưới ô, không gọi API', async () => {
    const fetchMock = stubApi();
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'register',
      email: 'moi@retainly.app',
      password: 'Mat-khau-moi-1',
      confirmPassword: 'Mat-khau-moi-2',
    });

    expect(await screen.findByText('Mật khẩu nhập lại không khớp')).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(false);
  });

  it('tab Đăng nhập không có ô nhập lại mật khẩu và tiêu chuẩn mật khẩu', () => {
    stubApi();
    renderLogin();

    expect(screen.queryByLabelText('Nhập lại mật khẩu')).toBeNull();
    expect(screen.queryByText('Tiêu chuẩn mật khẩu an toàn:')).toBeNull();
  });

  it('SPEC-011: mật khẩu chưa đủ điều kiện thì báo dưới ô, không gọi API', async () => {
    const fetchMock = stubApi();
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'register',
      email: 'moi@retainly.app',
      password: 'matkhaudai',
    });

    expect(
      await screen.findByText(
        'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký hiệu',
      ),
    ).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(false);
  });

  it('thành công: gọi API đăng ký và cũng qua màn thành công', async () => {
    const fetchMock = stubApi({
      'POST /api/auth/register': { status: 201, body: { session: SESSION } },
    });
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'register',
      email: 'moi@retainly.app',
      password: 'Mat-khau-moi-1',
    });

    expect(await screen.findByText('Xác thực thành công!')).toBeVisible();
    // Ô nhập lại chỉ để kiểm tra ở client, không gửi lên máy chủ.
    const register = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register');
    expect(JSON.parse(String(register?.[1]?.body))).toEqual({
      email: 'moi@retainly.app',
      password: 'Mat-khau-moi-1',
    });
  });

  it.each([
    [
      'TC-033: hệ thống đủ tài khoản thì hiện cảnh báo hết chỗ',
      apiError(403, 'ERR_USER_LIMIT_REACHED', 'Đã đạt giới hạn số tài khoản cho phép'),
      'Retainly đã đủ số tài khoản',
    ],
    [
      'TC-031: email trùng hiện thông điệp của máy chủ',
      apiError(409, 'ERR_EMAIL_TAKEN', 'Email này đã được đăng ký'),
      'Đăng ký không thành công: Email này đã được đăng ký',
    ],
  ])('%s', async (_name, reply, expected) => {
    stubApi({ 'POST /api/auth/register': reply });
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'register',
      email: 'moi@retainly.app',
      password: 'Mat-khau-moi-1',
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
  });
});

describe('E4-S1-T6 — đăng nhập Authentik SSO', () => {
  it('hiện màn kết nối, sau 2 giây mới rời sang Authentik', async () => {
    stubApi();
    const user = renderLogin();

    await user.click(screen.getByRole('button', { name: 'Đăng nhập với Authentik SSO' }));

    expect(screen.getByText('Đang kết nối tới Authentik SSO…')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(1900));
    expect(redirectToSso).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(redirectToSso).toHaveBeenCalledTimes(1);
  });

  it('bấm Hủy trong lúc chờ thì quay lại form và không rời trang', async () => {
    stubApi();
    const user = renderLogin();

    await user.click(screen.getByRole('button', { name: 'Đăng nhập với Authentik SSO' }));
    await user.click(screen.getByRole('button', { name: 'Hủy và quay lại' }));
    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(screen.getByRole('button', { name: 'Đăng nhập với Authentik SSO' })).toBeVisible();
    expect(redirectToSso).not.toHaveBeenCalled();
  });

  it.each([
    ['user_limit', 'Retainly đã đủ số tài khoản'],
    ['sso_failed', 'Đăng nhập SSO không thành công'],
  ])('callback trả về ?error=%s thì hiện banner tương ứng', (reason, title) => {
    stubApi();
    renderLogin(`/login?error=${reason}`);

    expect(screen.getByRole('alert')).toHaveTextContent(title);
  });
});

describe('E4-S1-T6 — kiểm tra form trước khi gửi', () => {
  it('email thiếu tên miền cấp cao thì báo dưới ô Email, không gọi API', async () => {
    const fetchMock = stubApi();
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'register',
      email: 'retainly@g',
      password: 'Admin@1234',
    });

    expect(await screen.findByText('Email chưa đúng định dạng, ví dụ ban@vidu.com')).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/register')).toBe(false);

    await user.type(screen.getByLabelText('Email'), '.com');
    expect(screen.queryByText('Email chưa đúng định dạng, ví dụ ban@vidu.com')).toBeNull();
  });

  it('chưa rời ô thì chưa báo lỗi; bấm gửi khi trống thì báo cả hai ô', async () => {
    const fetchMock = stubApi();
    const user = renderLogin();

    await user.type(screen.getByLabelText('Email'), 'ban');
    expect(screen.queryByText('Email chưa đúng định dạng, ví dụ ban@vidu.com')).toBeNull();

    await user.clear(screen.getByLabelText('Email'));
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Vui lòng nhập email')).toBeVisible();
    expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false);
  });

  it('đăng nhập không áp luật mật khẩu mạnh — tài khoản cũ vẫn vào được', async () => {
    const fetchMock = stubApi({
      'POST /api/auth/login': { status: 200, body: { session: SESSION } },
    });
    const user = renderLogin();

    await submitCredentials(user, {
      mode: 'login',
      email: 'cu@retainly.app',
      password: 'matkhaucu',
    });

    expect(await screen.findByText('Xác thực thành công!')).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(true);
  });
});
