import { describe, expect, it } from 'vitest';

import {
  fakePasswordHasher,
  inMemoryLocalUsers,
  inMemorySessions,
  userCounterAt,
} from '../../../shared/test/in-memory-auth';
import { generateTemporaryPassword } from '../domain/local-credentials';
import { registerLocal, signInLocal } from './local-credentials';
import { resetLocalPassword } from './reset-password';

const NOW = new Date('2026-09-24T10:00:00Z');
const CREDENTIALS = { email: 'thinh@example.com', password: 'Mat-khau-du-dai-1' };
const OTHER = { email: 'ban@example.com', password: 'Mat-khau-khac-2' };
const ZERO = () => 0;

function deps() {
  const sessions = inMemorySessions();
  return {
    localUsers: inMemoryLocalUsers(sessions),
    hasher: fakePasswordHasher(),
    sessions,
    userCounter: userCounterAt(0),
    now: () => NOW,
    randomInt: ZERO,
  };
}

describe('resetLocalPassword', () => {
  it('TC-075: cấp mật khẩu tạm, băm lại, chỉ huỷ phiên của đúng user', async () => {
    const d = deps();
    await registerLocal(d, CREDENTIALS);
    await signInLocal(d, CREDENTIALS);
    await registerLocal(d, OTHER);
    const temporaryPassword = generateTemporaryPassword(ZERO);

    const result = await resetLocalPassword(d, ' Thinh@Example.com ');

    expect(result).toEqual({ status: 'reset', temporaryPassword });
    expect(d.localUsers.rows[0]?.passwordHash).toBe(`hashed:${temporaryPassword}`);
    expect([...d.sessions.rows.values()].map((session) => session.userId)).toEqual(['local-2']);
    await expect(signInLocal(d, CREDENTIALS)).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
    });
    await expect(
      signInLocal(d, { ...CREDENTIALS, password: temporaryPassword }),
    ).resolves.toMatchObject({ session: { userId: 'local-1' } });
  });

  it('TC-075: email không thuộc tài khoản nội bộ nào (gồm user SSO) → not-local, không đổi gì', async () => {
    const d = deps();
    await registerLocal(d, CREDENTIALS);

    await expect(resetLocalPassword(d, 'sso@example.com')).resolves.toEqual({
      status: 'not-local',
    });
    expect(d.localUsers.rows[0]?.passwordHash).toBe(`hashed:${CREDENTIALS.password}`);
    expect(d.sessions.rows.size).toBe(1);
  });
});
