import { describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app';
import { inMemorySessions, inMemorySsoUsers } from '../../../shared/test/in-memory-auth';
import type { SsoClient, SsoTransaction } from '../application/sign-in-with-sso';
import { registerAuthRoutes } from './auth-routes';

const NOW = new Date('2026-09-17T10:00:00Z');
const AUTHORIZE_URL = new URL('https://auth.example.test/application/o/authorize/?client_id=x');
const TRANSACTION: SsoTransaction = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'pkce-1' };
const IDENTITY = { subject: 'authentik-sub-1', displayName: 'Thịnh' };

function setup(options: { appOrigin?: string; finishLogin?: SsoClient['finishLogin'] } = {}) {
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
    sessions,
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
  ])('%s trả 401 và không gọi Authentik', async (_name, cookies) => {
    const { app, sso } = setup();

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/sso/callback?code=abc&state=state-1',
      cookies,
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
    expect(sso.finishLogin).not.toHaveBeenCalled();

    await app.close();
  });

  it('Authentik từ chối hoặc kiểm tra token thất bại trả 401, không tạo phiên', async () => {
    const { app, sessions } = setup({
      finishLogin: async () => {
        throw new Error('state mismatch');
      },
    });

    const res = await signIn(app);

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('ERR_UNAUTHORIZED');
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
      session: { userId: 'user-1', expiresAt: '2026-10-01T10:00:00.000Z' },
    });

    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies });
    expect(logout.statusCode).toBe(204);
    expect(cookieNamed(logout, 'retainly_session')?.value).toBe('');

    const after = await app.inject({ method: 'GET', url: '/api/session', cookies });
    expect(after.statusCode).toBe(401);

    await app.close();
  });
});
