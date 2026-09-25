import { describe, expect, it } from 'vitest';

import {
  fakePasswordHasher,
  inMemoryLocalUsers,
  inMemorySessions,
  userCounterAt,
} from '../../../shared/test/in-memory-auth';
import { DUMMY_PASSWORD_HASH } from '../domain/local-credentials';
import {
  hashSessionToken,
  REMEMBERED_SESSION_TTL_MS,
  SESSION_TTL_MS,
} from '../domain/session-token';
import { registerLocal, signInLocal } from './local-credentials';
import { MAX_ACTIVE_USERS } from '../domain/user-limit';

const NOW = new Date('2026-09-17T10:00:00Z');
const CREDENTIALS = { email: 'thinh@example.com', password: 'Mat-khau-du-dai-1' };

function deps() {
  return {
    localUsers: inMemoryLocalUsers(),
    hasher: fakePasswordHasher(),
    sessions: inMemorySessions(),
    userCounter: userCounterAt(0),
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
        passwordHash: 'hashed:Mat-khau-du-dai-1',
        displayName: 'thinh',
      },
    ]);
    expect(result.session).toEqual({
      userId: 'local-1',
      expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS),
    });
    expect(d.sessions.rows.get(hashSessionToken(result.token))).toEqual(result.session);
  });

  it('TC-078: lưu họ và tên đã chuẩn hoá làm tên hiển thị', async () => {
    const d = deps();

    await registerLocal(d, { ...CREDENTIALS, displayName: '  Nguyễn  Văn A ' });

    expect(d.localUsers.rows[0].displayName).toBe('Nguyễn Văn A');
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

  it('TC-023: đủ 10 user thì chặn user thứ 11 bằng ERR_USER_LIMIT_REACHED', async () => {
    const d = { ...deps(), userCounter: userCounterAt(MAX_ACTIVE_USERS) };

    await expect(registerLocal(d, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_USER_LIMIT_REACHED',
    });
    expect(d.localUsers.rows).toHaveLength(0);
    expect(d.sessions.rows.size).toBe(0);
  });

  it('còn đúng một suất (9 user) thì vẫn đăng ký được', async () => {
    const d = { ...deps(), userCounter: userCounterAt(MAX_ACTIVE_USERS - 1) };

    await expect(registerLocal(d, CREDENTIALS)).resolves.toMatchObject({
      session: { userId: 'local-1' },
    });
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

  it.each([
    ['không tick', false, SESSION_TTL_MS],
    ['tick', true, REMEMBERED_SESSION_TTL_MS],
  ])('TC-077: %s "Duy trì đăng nhập" thì phiên có hạn tương ứng', async (_name, remember, ttl) => {
    const d = deps();
    await registerLocal(d, CREDENTIALS);

    const result = await signInLocal(d, { ...CREDENTIALS, remember });

    expect(result.remember).toBe(remember);
    expect(result.session.expiresAt).toEqual(new Date(NOW.getTime() + ttl));
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
        findById: async () => null,
        replacePassword: async () => {},
      },
    };

    await expect(signInLocal(d, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
    });
    expect(d.hasher.verified).toEqual([DUMMY_PASSWORD_HASH]);
  });
});
