import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { changePassword } from '../application/change-password';
import { registerLocal, signInLocal } from '../application/local-credentials';
import { hashSessionToken } from '../domain/session-token';
import { argon2PasswordHasher } from './argon2-password-hasher';
import {
  prismaLocalUserRepository,
  prismaSessionRepository,
  prismaUserCounter,
} from './prisma-auth-repositories';

const CREDENTIALS = { email: 'thinh@example.com', password: 'Mat-khau-du-dai-1' };
const OTHER = { email: 'ban@example.com', password: 'Mat-khau-khac-2' };
const NEW_PASSWORD = 'Mat-khau-moi-3';

const deps = {
  localUsers: prismaLocalUserRepository,
  hasher: argon2PasswordHasher,
  sessions: prismaSessionRepository,
  userCounter: prismaUserCounter,
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

describe('Đổi mật khẩu với Postgres + Argon2 thật', () => {
  it('TC-076: hash mới là Argon2id, chỉ còn phiên đang dùng, user khác giữ nguyên phiên', async () => {
    const current = await registerLocal(deps, CREDENTIALS);
    await signInLocal(deps, CREDENTIALS);
    const other = await registerLocal(deps, OTHER);
    const { userId } = current.session;

    await changePassword(deps, {
      userId,
      sessionToken: current.token,
      currentPassword: CREDENTIALS.password,
      newPassword: NEW_PASSWORD,
    });

    const row = await testPrisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(row.passwordHash).not.toContain(NEW_PASSWORD);
    await expect(
      testPrisma.session.findMany({ where: { userId }, select: { tokenHash: true } }),
    ).resolves.toEqual([{ tokenHash: hashSessionToken(current.token) }]);
    await expect(
      testPrisma.session.count({ where: { userId: other.session.userId } }),
    ).resolves.toBe(1);

    await expect(
      signInLocal(deps, { ...CREDENTIALS, password: NEW_PASSWORD }),
    ).resolves.toMatchObject({ session: { userId } });
  });

  it('TC-076: phiên của user nội bộ đọc ra authMethod local', async () => {
    const { token } = await registerLocal(deps, CREDENTIALS);

    await expect(
      prismaSessionRepository.findByTokenHash(hashSessionToken(token)),
    ).resolves.toMatchObject({ authMethod: 'local' });
  });
});
