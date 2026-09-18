import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { registerLocal, signInLocal } from '../application/local-credentials';
import { argon2PasswordHasher } from './argon2-password-hasher';
import { prismaLocalUserRepository, prismaSessionRepository } from './prisma-auth-repositories';

const CREDENTIALS = { email: 'thinh@example.com', password: 'mat-khau-du-dai' };

const deps = {
  localUsers: prismaLocalUserRepository,
  hasher: argon2PasswordHasher,
  sessions: prismaSessionRepository,
  now: () => new Date(),
};

beforeEach(async () => {
  await resetDatabase();
});

describe('Tài khoản nội bộ với Postgres + Argon2 thật', () => {
  it('TC-030: password_hash là chuỗi Argon2id, không chứa mật khẩu gốc', async () => {
    const { session } = await registerLocal(deps, CREDENTIALS);

    const row = await testPrisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    expect(row).toMatchObject({ email: CREDENTIALS.email, externalAuthId: null });
    expect(row.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(row.passwordHash).not.toContain(CREDENTIALS.password);
  });

  it('TC-034 + TC-035: đúng mật khẩu thì vào, sai thì bị từ chối', async () => {
    await registerLocal(deps, CREDENTIALS);

    await expect(signInLocal(deps, CREDENTIALS)).resolves.toMatchObject({
      session: { userId: expect.any(String) },
    });
    await expect(
      signInLocal(deps, { ...CREDENTIALS, password: 'sai-mat-khau' }),
    ).rejects.toMatchObject({ code: 'ERR_INVALID_CREDENTIALS' });
  });

  it('TC-035: email chưa đăng ký verify được với DUMMY_PASSWORD_HASH rồi trả lỗi chung', async () => {
    // Hash giả mà hỏng định dạng thì argon2 ném lỗi → 500, lộ luôn email không tồn tại.
    await expect(signInLocal(deps, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
    });
  });

  it('TC-031: unique index chặn email trùng lọt qua bước kiểm tra trước', async () => {
    const user = { email: CREDENTIALS.email, passwordHash: 'x', displayName: 'thinh' };
    await prismaLocalUserRepository.createLocal(user);

    await expect(prismaLocalUserRepository.createLocal(user)).rejects.toMatchObject({
      code: 'ERR_EMAIL_TAKEN',
    });
  });
});
