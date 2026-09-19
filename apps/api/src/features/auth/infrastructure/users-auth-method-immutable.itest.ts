import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';

const TRIGGER = /users_auth_method_immutable/;
const LOCAL_USER_ID = '00000000-0000-0000-0000-0000000000bb';

// UPDATE thẳng bằng SQL như TC-036: chứng minh chính PostgreSQL giữ BR-022,
// kể cả khi sau này có code lỡ viết API đổi phương thức xác thực.
beforeEach(async () => {
  await resetDatabase();
  await testPrisma.user.create({
    data: {
      id: LOCAL_USER_ID,
      email: 'local@example.com',
      passwordHash: '$argon2id$cu',
      displayName: 'User nội bộ',
    },
  });
});

describe('users trigger phương thức xác thực bất biến (BR-022)', () => {
  it('chặn đổi user SSO sang tài khoản nội bộ', async () => {
    await expect(
      testPrisma.$executeRaw`
        update users
        set external_auth_id = null, password_hash = '$argon2id$moi', email = 'sso@example.com'
        where id = ${TEST_USER_ID}::uuid
      `,
    ).rejects.toThrow(TRIGGER);
  });

  it('chặn đổi tài khoản nội bộ sang SSO', async () => {
    await expect(
      testPrisma.$executeRaw`
        update users set password_hash = null, external_auth_id = 'sso-moi'
        where id = ${LOCAL_USER_ID}::uuid
      `,
    ).rejects.toThrow(TRIGGER);
  });

  it('chặn đổi định danh SSO sang subject khác', async () => {
    await expect(
      testPrisma.$executeRaw`
        update users set external_auth_id = 'test:ke-khac' where id = ${TEST_USER_ID}::uuid
      `,
    ).rejects.toThrow(TRIGGER);
  });

  it('vẫn cho đổi mật khẩu, email và tên hiển thị', async () => {
    await expect(
      testPrisma.$executeRaw`
        update users
        set password_hash = '$argon2id$moi', email = 'moi@example.com', display_name = 'Tên mới'
        where id = ${LOCAL_USER_ID}::uuid
      `,
    ).resolves.toBe(1);
  });
});
