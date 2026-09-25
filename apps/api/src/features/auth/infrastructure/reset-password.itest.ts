import assert from 'node:assert';
import { randomInt } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { registerLocal, signInLocal } from '../application/local-credentials';
import { resetLocalPassword } from '../application/reset-password';
import { argon2PasswordHasher } from './argon2-password-hasher';
import {
  prismaLocalUserRepository,
  prismaSessionRepository,
  prismaUserCounter,
} from './prisma-auth-repositories';

const CREDENTIALS = { email: 'thinh@example.com', password: 'Mat-khau-du-dai-1' };
const OTHER = { email: 'ban@example.com', password: 'Mat-khau-khac-2' };

const deps = {
  localUsers: prismaLocalUserRepository,
  hasher: argon2PasswordHasher,
  sessions: prismaSessionRepository,
  userCounter: prismaUserCounter,
  now: () => new Date(),
  randomInt: (max: number) => randomInt(max),
};

beforeEach(async () => {
  await resetDatabase();
});

describe('Đặt lại mật khẩu với Postgres + Argon2 thật', () => {
  it('TC-075: mật khẩu tạm thay mật khẩu cũ, huỷ mọi phiên của user, không đụng user khác', async () => {
    const { session } = await registerLocal(deps, CREDENTIALS);
    await signInLocal(deps, CREDENTIALS);
    const other = await registerLocal(deps, OTHER);

    const result = await resetLocalPassword(deps, CREDENTIALS.email);
    assert(result.status === 'reset');

    const row = await testPrisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(row.passwordHash).not.toContain(result.temporaryPassword);
    await expect(testPrisma.session.count({ where: { userId: session.userId } })).resolves.toBe(0);
    await expect(
      testPrisma.session.count({ where: { userId: other.session.userId } }),
    ).resolves.toBe(1);

    await expect(signInLocal(deps, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
    });
    await expect(
      signInLocal(deps, { ...CREDENTIALS, password: result.temporaryPassword }),
    ).resolves.toMatchObject({ session: { userId: session.userId } });
  });

  it('TC-075: không có tài khoản nội bộ với email đó (user SSO không có email) → not-local', async () => {
    const before = await testPrisma.user.findMany({ orderBy: { id: 'asc' } });

    await expect(resetLocalPassword(deps, 'sso@example.com')).resolves.toEqual({
      status: 'not-local',
    });
    await expect(testPrisma.user.findMany({ orderBy: { id: 'asc' } })).resolves.toEqual(before);
  });
});
