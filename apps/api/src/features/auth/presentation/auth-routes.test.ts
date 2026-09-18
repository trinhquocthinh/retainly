import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app';
import {
  fakePasswordHasher,
  inMemoryLocalUsers,
  inMemorySessions,
  inMemorySsoUsers,
  userCounterAt,
} from '../../../shared/test/in-memory-auth';
import type { SsoClient, SsoTransaction } from '../application/sign-in-with-sso';
import { registerAuthRoutes } from './auth-routes';
import { MAX_ACTIVE_USERS } from '../domain/user-limit';

const NOW = new Date('2026-09-17T10:00:00Z');
const AUTHORIZE_URL = new URL('https://auth.example.test/application/o/authorize/?client_id=x');
const TRANSACTION: SsoTransaction = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'pkce-1' };
const IDENTITY = { subject: 'authentik-sub-1', displayName: 'Thịnh' };

function setup(
  options: { appOrigin?: string; finishLogin?: SsoClient['finishLogin']; userCount?: number } = {},
) {
  const sso = {
    startLogin: vi.fn<SsoClient['startLogin']>(async () => ({
      authorizationUrl: AUTHORIZE_URL,
      transaction: TRANSACTION,
    })),
    finishLogin: vi.fn<SsoClient['finishLogin']>(options.finishLogin ?? (async () => IDENTITY)),
  };
  const users = inMemorySsoUsers();
  const sessions = inMemorySessions();

  const app = buildApp();
  registerAuthRoutes(app, {
    sso,
    users,
    localUsers: inMemoryLocalUsers(),
    hasher: fakePasswordHasher(),
    sessions,
    userCounter: userCounterAt(options.userCount ?? 0),
    now: () => NOW,
    appOrigin: new URL(options.appOrigin ?? 'https://retainly.example.test'),
    cookieSecret: 'bi-mat-test-dai-hon-ba-muoi-hai-ky-tu',
  });

  return { app, sso, users, sessions };
}

type App = ReturnType<typeof setup>['app'];

function cookieNamed(res: Awaited<ReturnType<App['inject']>>, name: string) {
  return res.cookies.find((cookie) => cookie.name === name);
}

/** Đi hết login → callback, trả về response callback. */
async function signIn(app: App) {
  const login = await app.inject({ method: 'GET', url: '/api/auth/sso/login' });
  const ssoCookie = cookieNamed(login, 'retainly_sso');

  return app.inject({
    method: 'GET',
    url: '/api/auth/sso/callback?code=abc&state=state-1',
    cookies: { retainly_sso: ssoCookie?.value ?? '' },
  });
}

describe('E4-S1-T3 — GET /api/auth/sso/login', () => {
  it('chuyển hướng sang Authentik và cất transaction vào cookie tạm có ký', async () => {
    const { app } = setup();

    const res = await app.inject({ method: 'GET', url: '/api/auth/sso/login' });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(AUTHORIZE_URL.href);
    expect(cookieNamed(res, 'retainly_sso')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/api/auth/sso',
      maxAge: 600,
    });
    // Có chữ ký phía sau giá trị gốc.
    expect(cookieNamed(res, 'retainly_sso')?.value).toMatch(/^.+\..+$/);

    await app.close();
  });

  it('TC-023: hệ thống đủ 10 user thì callback của subject mới về /login báo đầy', async () => {
    const { app, users, sessions } = setup({ userCount: MAX_ACTIVE_USERS });

    const res = await signIn(app);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?error=user_limit');
    expect(cookieNamed(res, 'retainly_session')).toBeUndefined();
    expect(users.created).toHaveLength(0);
    expect(sessions.rows.size).toBe(0);

    await app.close();
  });

  it('E4-S1-T6: Authentik không phản hồi thì về /login báo lỗi SSO, không đặt cookie tạm', async () => {
    const { app, sso } = setup();
    sso.startLogin.mockRejectedValueOnce(new Error('discovery failed'));

    const res = await app.inject({ method: 'GET', url: '/api/auth/sso/login' });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?error=sso_failed');
    expect(cookieNamed(res, 'retainly_sso')).toBeUndefined();

    await app.close();
  });
});

describe('E4-S1-T3 — GET /api/auth/sso/callback', () => {
  it('TC-021: tạo user, đặt session cookie an toàn rồi về trang chủ', async () => {
    const { app, sso, users, sessions } = setup();

    const res = await signIn(app);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(sso.finishLogin).toHaveBeenCalledWith(
      new URL('https://retainly.example.test/api/auth/sso/callback?code=abc&state=state-1'),
      TRANSACTION,
    );
    expect(users.created).toEqual([IDENTITY]);
    expect(sessions.rows.size).toBe(1);

    expect(cookieNamed(res, 'retainly_session')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      expires: new Date('2026-10-01T10:00:00Z'),
    });

    await app.close();
  });

  it('APP_ORIGIN http (dev) thì cookie không gắn Secure', async () => {
    const { app } = setup({ appOrigin: 'http://localhost:5173' });

    const res = await signIn(app);

    expect(cookieNamed(res, 'retainly_session')?.secure).toBeUndefined();

    await app.close();
  });

  it.each([
    ['không có cookie tạm', {}],
    ['cookie tạm bị sửa chữ ký', { retainly_sso: 'gia-tri.chu-ky-gia' }],
  ])('%s thì về /login báo lỗi SSO và không gọi Authentik', async (_name, cookies) => {
    const { app, sso } = setup();

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/sso/callback?code=abc&state=state-1',
      cookies,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?error=sso_failed');
    expect(sso.finishLogin).not.toHaveBeenCalled();

    await app.close();
  });

  it('Authentik từ chối hoặc kiểm tra token thất bại thì về /login, không tạo phiên', async () => {
    const { app, sessions } = setup({
      finishLogin: async () => {
        throw new Error('state mismatch');
      },
    });

    const res = await signIn(app);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login?error=sso_failed');
    expect(sessions.rows.size).toBe(0);

    await app.close();
  });
});

describe('E4-S1-T3 — phiên và đăng xuất', () => {
  it('GET /api/session không có cookie trả 401', async () => {
    const { app } = setup();

    const res = await app.inject({ method: 'GET', url: '/api/session' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');

    await app.close();
  });

  it('cookie từ callback mở được phiên; đăng xuất xong cookie cũ hết tác dụng', async () => {
    const { app } = setup();
    const callback = await signIn(app);
    const cookies = { retainly_session: cookieNamed(callback, 'retainly_session')?.value ?? '' };

    const session = await app.inject({ method: 'GET', url: '/api/session', cookies });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toEqual({
      session: {
        userId: 'user-1',
        expiresAt: '2026-10-01T10:00:00.000Z',
        displayName: 'Người dùng user-1',
      },
    });

    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies });
    expect(logout.statusCode).toBe(204);
    expect(cookieNamed(logout, 'retainly_session')?.value).toBe('');

    const after = await app.inject({ method: 'GET', url: '/api/session', cookies });
    expect(after.statusCode).toBe(401);

    await app.close();
  });
});

describe('E4-S1-T4 — tài khoản nội bộ', () => {
  const CREDENTIALS = { email: 'thinh@example.com', password: 'Mat-khau-du-dai-1' };

  function post(app: App, url: string, payload: object) {
    return app.inject({ method: 'POST', url, payload });
  }

  it('TC-030: đăng ký trả 201, session và cookie phiên an toàn', async () => {
    const { app } = setup();

    const res = await post(app, '/api/auth/register', CREDENTIALS);

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      session: { userId: 'local-1', expiresAt: '2026-10-01T10:00:00.000Z' },
    });
    expect(cookieNamed(res, 'retainly_session')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
    });

    await app.close();
  });

  it('TC-031: đăng ký trùng email trả 409 ERR_EMAIL_TAKEN', async () => {
    const { app } = setup();
    await post(app, '/api/auth/register', CREDENTIALS);

    const res = await post(app, '/api/auth/register', CREDENTIALS);

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('ERR_EMAIL_TAKEN');

    await app.close();
  });

  it.each([
    ['7 ký tự', 'Abc12!x'],
    ['đủ dài nhưng thiếu chữ hoa và số', 'mat-khau-du-dai'],
  ])('TC-032: mật khẩu %s trả 400 ERR_WEAK_PASSWORD', async (_name, password) => {
    const { app } = setup();

    const res = await post(app, '/api/auth/register', { ...CREDENTIALS, password });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_WEAK_PASSWORD');

    await app.close();
  });

  it.each([
    ['email sai định dạng', { ...CREDENTIALS, email: 'khong-phai-email' }],
    ['thiếu mật khẩu', { email: CREDENTIALS.email }],
    ['mật khẩu quá 1024 ký tự', { ...CREDENTIALS, password: 'a'.repeat(1025) }],
  ])('%s trả 400 ERR_BAD_REQUEST', async (_name, payload) => {
    const { app } = setup();

    const res = await post(app, '/api/auth/register', payload);

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');

    await app.close();
  });

  it('TC-034: đăng nhập đúng trả 200; cookie mở được /api/session', async () => {
    const { app } = setup();
    await post(app, '/api/auth/register', CREDENTIALS);

    const login = await post(app, '/api/auth/login', CREDENTIALS);
    expect(login.statusCode).toBe(200);
    expect(login.json().session.userId).toBe('local-1');

    const cookies = { retainly_session: cookieNamed(login, 'retainly_session')?.value ?? '' };
    const session = await app.inject({ method: 'GET', url: '/api/session', cookies });
    expect(session.json().session.userId).toBe('local-1');

    await app.close();
  });

  it('TC-035: sai mật khẩu và email lạ trả cùng một phản hồi 401', async () => {
    const { app } = setup();
    await post(app, '/api/auth/register', CREDENTIALS);

    const wrongPassword = await post(app, '/api/auth/login', {
      ...CREDENTIALS,
      password: 'sai-roi-nhe',
    });
    const unknownEmail = await post(app, '/api/auth/login', {
      ...CREDENTIALS,
      email: 'la@example.com',
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
    expect(wrongPassword.json().error.code).toBe('ERR_INVALID_CREDENTIALS');
    expect(cookieNamed(wrongPassword, 'retainly_session')).toBeUndefined();

    await app.close();
  });

  it('TC-033: hệ thống đủ 10 user thì đăng ký trả 403, không đặt cookie', async () => {
    const { app } = setup({ userCount: MAX_ACTIVE_USERS });

    const res = await post(app, '/api/auth/register', CREDENTIALS);

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ERR_USER_LIMIT_REACHED');
    expect(cookieNamed(res, 'retainly_session')).toBeUndefined();

    await app.close();
  });
});
