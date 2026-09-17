import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../../../shared/test/db';

const CONSTRAINT = /users_exactly_one_auth_method_chk/;

// Insert thẳng bằng SQL, bỏ qua mọi kiểm tra ở tầng application: TC-036 chứng
// minh chính PostgreSQL chặn dữ liệu sai, kể cả khi code có lỗi hoặc bị vượt qua.
function insertUser(auth: {
  email: string | null;
  passwordHash: string | null;
  externalAuthId: string | null;
}) {
  return testPrisma.$executeRaw`
    insert into users (id, display_name, email, password_hash, external_auth_id)
    values (${randomUUID()}::uuid, 'User TC-036', ${auth.email}, ${auth.passwordHash}, ${auth.externalAuthId})
  `;
}

beforeEach(async () => {
  await resetDatabase();
});

describe('users CHECK constraint một phương thức xác thực (BR-022)', () => {
  it('TC-036: chặn user có cả tài khoản nội bộ lẫn SSO', async () => {
    await expect(
      insertUser({
        email: 'both@example.com',
        passwordHash: '$argon2id$fake',
        externalAuthId: 'sso-both',
      }),
    ).rejects.toThrow(CONSTRAINT);
  });

  it('chặn user không có phương thức xác thực nào', async () => {
    await expect(
      insertUser({ email: 'none@example.com', passwordHash: null, externalAuthId: null }),
    ).rejects.toThrow(CONSTRAINT);
  });

  it('chặn tài khoản nội bộ thiếu email', async () => {
    await expect(
      insertUser({ email: null, passwordHash: '$argon2id$fake', externalAuthId: null }),
    ).rejects.toThrow(CONSTRAINT);
  });

  it('cho phép tài khoản nội bộ có email và password hash', async () => {
    await expect(
      insertUser({
        email: 'local@example.com',
        passwordHash: '$argon2id$fake',
        externalAuthId: null,
      }),
    ).resolves.toBe(1);
  });

  it('cho phép user SSO, có hoặc không có email', async () => {
    await expect(
      insertUser({ email: null, passwordHash: null, externalAuthId: 'sso-no-email' }),
    ).resolves.toBe(1);
    await expect(
      insertUser({
        email: 'sso@example.com',
        passwordHash: null,
        externalAuthId: 'sso-with-email',
      }),
    ).resolves.toBe(1);
  });
});
