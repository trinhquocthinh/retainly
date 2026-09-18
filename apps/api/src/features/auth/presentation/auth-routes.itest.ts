import { beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { MAX_ACTIVE_USERS } from '../domain/user-limit';
import { argon2PasswordHasher } from '../infrastructure/argon2-password-hasher';
import {
  prismaLocalUserRepository,
  prismaSessionRepository,
  prismaSsoUserRepository,
  prismaUserCounter,
} from '../infrastructure/prisma-auth-repositories';
import { registerAuthRoutes } from './auth-routes';

const CREDENTIALS = { email: 'nguoi-thu-11@example.com', password: 'Mat-khau-du-dai-1' };

beforeEach(async () => {
  await resetDatabase();
});

function buildAuthApp() {
  const app = buildApp();
  registerAuthRoutes(app, {
    sso: {
      startLogin: () => Promise.reject(new Error('Test này không đi qua SSO')),
      finishLogin: () => Promise.reject(new Error('Test này không đi qua SSO')),
    },
    users: prismaSsoUserRepository,
    localUsers: prismaLocalUserRepository,
    hasher: argon2PasswordHasher,
    sessions: prismaSessionRepository,
    userCounter: prismaUserCounter,
    now: () => new Date(),
    appOrigin: new URL('https://retainly.example.test'),
    cookieSecret: 'bi-mat-test-dai-hon-ba-muoi-hai-ky-tu',
  });
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
