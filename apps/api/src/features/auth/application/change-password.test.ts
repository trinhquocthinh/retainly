import { describe, expect, it } from 'vitest';

import {
  fakePasswordHasher,
  inMemoryLocalUsers,
  inMemorySessions,
  userCounterAt,
} from '../../../shared/test/in-memory-auth';
import { DUMMY_PASSWORD_HASH } from '../domain/local-credentials';
import { changePassword } from './change-password';
import { registerLocal, signInLocal } from './local-credentials';

const NOW = new Date('2026-09-25T10:00:00Z');
const CREDENTIALS = { email: 'thinh@example.com', password: 'Mat-khau-du-dai-1' };
const OTHER = { email: 'ban@example.com', password: 'Mat-khau-khac-2' };
const NEW_PASSWORD = 'Mat-khau-moi-3';

function deps() {
  const sessions = inMemorySessions();
  return {
    localUsers: inMemoryLocalUsers(sessions),
    hasher: fakePasswordHasher(),
    sessions,
    userCounter: userCounterAt(0),
    now: () => NOW,
  };
}

/** User `local-1` đăng nhập trên hai thiết bị; `local-2` là người khác. Trả token của thiết bị đang dùng. */
async function twoDevicesAndAnotherUser(d: ReturnType<typeof deps>) {
  const current = await registerLocal(d, CREDENTIALS);
  await signInLocal(d, CREDENTIALS);
  await registerLocal(d, OTHER);
  return current.token;
}

function sessionOwners(d: ReturnType<typeof deps>) {
  return [...d.sessions.rows.values()].map((session) => session.userId);
}

describe('changePassword', () => {
  it('TC-076: đúng mật khẩu hiện tại → băm lại, giữ phiên đang dùng, huỷ phiên khác của chính user', async () => {
    const d = deps();
    const token = await twoDevicesAndAnotherUser(d);

    await changePassword(d, {
      userId: 'local-1',
      sessionToken: token,
      currentPassword: CREDENTIALS.password,
      newPassword: NEW_PASSWORD,
    });

    expect(d.localUsers.rows[0]?.passwordHash).toBe(`hashed:${NEW_PASSWORD}`);
    expect(sessionOwners(d)).toEqual(['local-1', 'local-2']);
    await expect(signInLocal(d, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
    });
    await expect(signInLocal(d, { ...CREDENTIALS, password: NEW_PASSWORD })).resolves.toMatchObject(
      { session: { userId: 'local-1' } },
    );
  });

  it('TC-076: sai mật khẩu hiện tại → ERR_INVALID_CREDENTIALS, không đổi gì', async () => {
    const d = deps();
    const token = await twoDevicesAndAnotherUser(d);

    await expect(
      changePassword(d, {
        userId: 'local-1',
        sessionToken: token,
        currentPassword: 'Sai-mat-khau-9',
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({ code: 'ERR_INVALID_CREDENTIALS' });
    expect(d.localUsers.rows[0]?.passwordHash).toBe(`hashed:${CREDENTIALS.password}`);
    expect(d.sessions.rows.size).toBe(3);
  });

  it('TC-076: mật khẩu mới yếu → ERR_WEAK_PASSWORD trước cả khi verify', async () => {
    const d = deps();
    const token = await twoDevicesAndAnotherUser(d);

    await expect(
      changePassword(d, {
        userId: 'local-1',
        sessionToken: token,
        currentPassword: CREDENTIALS.password,
        newPassword: 'yeu',
      }),
    ).rejects.toMatchObject({ code: 'ERR_WEAK_PASSWORD' });
    // Chỉ còn lần verify của bước đăng nhập lúc chuẩn bị.
    expect(d.hasher.verified).toHaveLength(1);
    expect(d.sessions.rows.size).toBe(3);
  });

  it('TC-076: user SSO không có mật khẩu → ERR_INVALID_CREDENTIALS, vẫn verify với hash giả', async () => {
    const d = deps();

    await expect(
      changePassword(d, {
        userId: 'user-sso',
        sessionToken: 'token-sso',
        currentPassword: 'Bat-ky-gi-1',
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({ code: 'ERR_INVALID_CREDENTIALS' });
    expect(d.hasher.verified).toEqual([DUMMY_PASSWORD_HASH]);
  });
});
