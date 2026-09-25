import { beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { MAX_ACTIVE_USERS } from '../domain/user-limit';
import { registerPrismaAuthRoutes } from '../../../shared/test/prisma-auth-routes';

const CREDENTIALS = { email: 'nguoi-thu-11@example.com', password: 'Mat-khau-du-dai-1' };

beforeEach(async () => {
  await resetDatabase();
});

function buildAuthApp() {
  const app = buildApp();
  registerPrismaAuthRoutes(app);
  return app;
}

/** resetDatabase đã seed sẵn vài user; bù thêm user SSO cho đủ `total`. */
async function fillUsersUpTo(total: number) {
  const missing = total - (await testPrisma.user.count());
  await testPrisma.user.createMany({
    data: Array.from({ length: missing }, (_, i) => ({
      externalAuthId: `test:filler-${i}`,
      displayName: `Người dùng ${i}`,
    })),
  });
}

describe('E4-S1-T5 — trần tài khoản với Postgres thật', () => {
  it('TC-033: đã có 10 user thì đăng ký thứ 11 trả 403 và không tạo thêm user', async () => {
    await fillUsersUpTo(MAX_ACTIVE_USERS);
    const app = buildAuthApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: CREDENTIALS,
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ERR_USER_LIMIT_REACHED');
    expect(await testPrisma.user.count()).toBe(MAX_ACTIVE_USERS);

    await app.close();
  });

  it('còn một suất (9 user) thì đăng ký được, hệ thống lên đúng 10', async () => {
    await fillUsersUpTo(MAX_ACTIVE_USERS - 1);
    const app = buildAuthApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: CREDENTIALS,
    });

    expect(res.statusCode).toBe(201);
    expect(await testPrisma.user.count()).toBe(MAX_ACTIVE_USERS);

    await app.close();
  });
});

describe('E11-S1-T4 — họ và tên khi đăng ký với Postgres thật', () => {
  it('TC-078: họ và tên đã nhập thành tên hiển thị của phiên', async () => {
    const app = buildAuthApp();

    const register = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { ...CREDENTIALS, displayName: ' Nguyễn  Văn A ' },
    });
    const token = register.cookies.find((cookie) => cookie.name === 'retainly_session')?.value;
    const session = await app.inject({
      method: 'GET',
      url: '/api/session',
      cookies: { retainly_session: token ?? '' },
    });

    expect(register.statusCode).toBe(201);
    expect(session.json().session.displayName).toBe('Nguyễn Văn A');

    await app.close();
  });
});
