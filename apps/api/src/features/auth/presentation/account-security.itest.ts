import assert from 'node:assert';
import { randomInt } from 'node:crypto';
import type { LightMyRequestResponse } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { registerPrismaAuthRoutes } from '../../../shared/test/prisma-auth-routes';
import { resetLocalPassword } from '../application/reset-password';
import { argon2PasswordHasher } from '../infrastructure/argon2-password-hasher';
import { prismaLocalUserRepository } from '../infrastructure/prisma-auth-repositories';

/**
 * E11-S1-T5 (TC-079): các luồng tài khoản của Epic 11 đi trọn đường thật —
 * cookie → hook tra phiên → route → Argon2 → Postgres. Mỗi ca đóng vai kẻ tấn
 * công cầm một thứ cụ thể (cookie thiết bị cũ, id người khác, form khác site).
 */
const OWNER = { email: 'chu-tai-khoan@example.com', password: 'Mat-khau-chu-1' };
const INTRUDER = { email: 'ke-xau@example.com', password: 'Mat-khau-ke-xau-2' };
const NEW_PASSWORD = 'Mat-khau-moi-3';
const HOUR_MS = 60 * 60 * 1000;

type SessionCookies = { retainly_session: string };

let app: ReturnType<typeof buildApp>;

beforeEach(async () => {
  await resetDatabase();
  app = buildApp();
  registerPrismaAuthRoutes(app);

  return () => app.close();
});

function sessionCookieOf(res: LightMyRequestResponse): SessionCookies {
  const cookie = res.cookies.find(({ name }) => name === 'retainly_session');
  assert(cookie !== undefined, `Không có cookie phiên (HTTP ${res.statusCode})`);
  return { retainly_session: cookie.value };
}

async function register(credentials: typeof OWNER) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials });
  expect(res.statusCode).toBe(201);
  return { userId: res.json().session.userId as string, cookies: sessionCookieOf(res) };
}

function login(credentials: typeof OWNER, remember = false) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { ...credentials, remember },
  });
}

async function sessionStatus(cookies: SessionCookies) {
  const res = await app.inject({ method: 'GET', url: '/api/session', cookies });
  return res.statusCode;
}

function changePassword(cookies: SessionCookies, payload: Record<string, string>) {
  return app.inject({ method: 'POST', url: '/api/auth/password', cookies, payload });
}

async function passwordHashOf(userId: string) {
  const user = await testPrisma.user.findUniqueOrThrow({ where: { id: userId } });
  return user.passwordHash;
}

describe('E11-S1-T5 — bảo mật tài khoản trên đường thật', () => {
  it('đổi mật khẩu cắt ngay phiên ở thiết bị bị lộ; mật khẩu cũ hết dùng được', async () => {
    const owner = await register(OWNER);
    const leakedDevice = sessionCookieOf(await login(OWNER, true));

    const res = await changePassword(owner.cookies, {
      currentPassword: OWNER.password,
      newPassword: NEW_PASSWORD,
    });

    expect(res.statusCode).toBe(204);
    expect(await sessionStatus(owner.cookies)).toBe(200);
    expect(await sessionStatus(leakedDevice)).toBe(401);
    expect((await login(OWNER)).statusCode).toBe(401);
    expect((await login({ ...OWNER, password: NEW_PASSWORD })).statusCode).toBe(200);
  });

  it('userId và sessionToken gửi kèm body bị bỏ qua: đổi mật khẩu chỉ tác động người đang đăng nhập', async () => {
    const owner = await register(OWNER);
    const intruder = await register(INTRUDER);
    const ownerHash = await passwordHashOf(owner.userId);
    const identityOfOwner = { userId: owner.userId, sessionToken: owner.cookies.retainly_session };

    // Kẻ xấu biết mật khẩu của chủ, định đổi hộ từ phiên của mình: bị coi là
    // sai mật khẩu hiện tại của chính kẻ xấu.
    const hijack = await changePassword(intruder.cookies, {
      ...identityOfOwner,
      currentPassword: OWNER.password,
      newPassword: NEW_PASSWORD,
    });
    // Đổi mật khẩu của chính mình, vẫn kèm danh tính của chủ trong body.
    const own = await changePassword(intruder.cookies, {
      ...identityOfOwner,
      currentPassword: INTRUDER.password,
      newPassword: NEW_PASSWORD,
    });

    expect(hijack.statusCode).toBe(401);
    expect(hijack.json().error.code).toBe('ERR_INVALID_CREDENTIALS');
    expect(own.statusCode).toBe(204);
    expect(await passwordHashOf(owner.userId)).toBe(ownerHash);
    expect(await sessionStatus(owner.cookies)).toBe(200);
    expect(await sessionStatus(intruder.cookies)).toBe(200);
  });

  it('quản trị viên đặt lại mật khẩu: mọi cookie cũ của user bị từ chối, user khác không ảnh hưởng', async () => {
    const owner = await register(OWNER);
    const rememberedDevice = sessionCookieOf(await login(OWNER, true));
    const other = await register(INTRUDER);

    const result = await resetLocalPassword(
      {
        localUsers: prismaLocalUserRepository,
        hasher: argon2PasswordHasher,
        randomInt: (max) => randomInt(max),
      },
      OWNER.email,
    );
    assert(result.status === 'reset');

    expect(await sessionStatus(owner.cookies)).toBe(401);
    expect(await sessionStatus(rememberedDevice)).toBe(401);
    expect(await sessionStatus(other.cookies)).toBe(200);
    expect((await login({ ...OWNER, password: result.temporaryPassword })).statusCode).toBe(200);
  });

  it('phiên trình duyệt sống 24 giờ, "Duy trì đăng nhập" 30 ngày; quá hạn thì 401 và xoá khỏi DB', async () => {
    const owner = await register(OWNER);
    const rememberedDevice = sessionCookieOf(await login(OWNER, true));

    const sessions = await testPrisma.session.findMany({
      where: { userId: owner.userId },
      orderBy: { expiresAt: 'asc' },
    });
    const lifetimesInHours = sessions.map(({ expiresAt }) =>
      Math.round((expiresAt.getTime() - Date.now()) / HOUR_MS),
    );
    expect(lifetimesInHours).toEqual([24, 30 * 24]);

    await testPrisma.session.updateMany({
      where: { userId: owner.userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await sessionStatus(owner.cookies)).toBe(401);
    expect(await sessionStatus(rememberedDevice)).toBe(401);
    await expect(testPrisma.session.count({ where: { userId: owner.userId } })).resolves.toBe(0);
  });

  // SameSite=Lax đã chặn cookie trong POST khác site; đây là lớp thứ hai: form
  // HTML chỉ gửi được các content-type "đơn giản", và API không nhận cái nào.
  it.each([
    [
      'application/x-www-form-urlencoded',
      `currentPassword=${OWNER.password}&newPassword=${NEW_PASSWORD}`,
      415,
    ],
    [
      'text/plain',
      JSON.stringify({ currentPassword: OWNER.password, newPassword: NEW_PASSWORD }),
      400,
    ],
  ])('form khác site gửi %s không đổi được mật khẩu', async (contentType, payload, status) => {
    const owner = await register(OWNER);
    const ownerHash = await passwordHashOf(owner.userId);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      cookies: owner.cookies,
      headers: { 'content-type': contentType },
      payload,
    });

    expect(res.statusCode).toBe(status);
    expect(await passwordHashOf(owner.userId)).toBe(ownerHash);
  });
});
