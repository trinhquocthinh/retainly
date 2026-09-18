import { describe, expect, it } from 'vitest';

import {
  fakePasswordHasher,
  inMemoryLocalUsers,
  inMemorySessions,
} from '../../../shared/test/in-memory-auth';
import { DUMMY_PASSWORD_HASH } from '../domain/local-credentials';
import { hashSessionToken, SESSION_TTL_MS } from '../domain/session-token';
import { registerLocal, signInLocal } from './local-credentials';

const NOW = new Date('2026-09-17T10:00:00Z');
const CREDENTIALS = { email: 'thinh@example.com', password: 'mat-khau-du-dai' };

function deps() {
  return {
    localUsers: inMemoryLocalUsers(),
    hasher: fakePasswordHasher(),
    sessions: inMemorySessions(),
    now: () => NOW,
  };
}

describe('registerLocal', () => {
  it('TC-030: tạo user với mật khẩu đã băm, email chuẩn hoá, rồi mở phiên', async () => {
    const d = deps();

    const result = await registerLocal(d, { ...CREDENTIALS, email: ' Thinh@Example.com ' });

    expect(d.localUsers.rows).toEqual([
      {
        id: 'local-1',
        email: 'thinh@example.com',
        passwordHash: 'hashed:mat-khau-du-dai',
        displayName: 'thinh',
      },
    ]);
    expect(result.session).toEqual({
      userId: 'local-1',
      expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS),
    });
    expect(d.sessions.rows.get(hashSessionToken(result.token))).toEqual(result.session);
  });

  it('TC-031: email đã tồn tại (khác hoa/thường) trả ERR_EMAIL_TAKEN', async () => {
    const d = deps();
    await registerLocal(d, CREDENTIALS);

    await expect(
      registerLocal(d, { ...CREDENTIALS, email: 'THINH@example.com' }),
    ).rejects.toMatchObject({ code: 'ERR_EMAIL_TAKEN' });
    expect(d.localUsers.rows).toHaveLength(1);
  });

  it('TC-032: mật khẩu dưới 8 ký tự trả ERR_WEAK_PASSWORD, không tạo gì', async () => {
    const d = deps();

    await expect(registerLocal(d, { ...CREDENTIALS, password: '1234567' })).rejects.toMatchObject({
      code: 'ERR_WEAK_PASSWORD',
    });
    expect(d.localUsers.rows).toHaveLength(0);
    expect(d.sessions.rows.size).toBe(0);
  });
});

describe('signInLocal', () => {
  it('TC-034: đúng email (khác hoa/thường) và mật khẩu thì mở phiên mới', async () => {
    const d = deps();
    await registerLocal(d, CREDENTIALS);

    const result = await signInLocal(d, { ...CREDENTIALS, email: 'THINH@EXAMPLE.COM' });

    expect(result.session.userId).toBe('local-1');
    expect(d.sessions.rows.size).toBe(2);
  });

  it('TC-035: sai mật khẩu trả ERR_INVALID_CREDENTIALS', async () => {
    const d = deps();
    await registerLocal(d, CREDENTIALS);

    await expect(
      signInLocal(d, { ...CREDENTIALS, password: 'sai-mat-khau' }),
    ).rejects.toMatchObject({ code: 'ERR_INVALID_CREDENTIALS' });
  });

  it('TC-035: email không tồn tại trả cùng lỗi và vẫn chạy verify với hash giả', async () => {
    const d = deps();

    await expect(signInLocal(d, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
    });
    expect(d.hasher.verified).toEqual([DUMMY_PASSWORD_HASH]);
    expect(d.sessions.rows.size).toBe(0);
  });

  it('user không có mật khẩu (dữ liệu lệch) cũng trả ERR_INVALID_CREDENTIALS', async () => {
    const d = {
      ...deps(),
      localUsers: {
        findByEmail: async () => ({ id: 'sso-1', passwordHash: null }),
        createLocal: async () => ({ id: 'never' }),
      },
    };

    await expect(signInLocal(d, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
    });
    expect(d.hasher.verified).toEqual([DUMMY_PASSWORD_HASH]);
  });
});
