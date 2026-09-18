import { describe, expect, it } from 'vitest';

import {
  inMemorySessions,
  inMemorySsoUsers,
  userCounterAt,
} from '../../../shared/test/in-memory-auth';
import { hashSessionToken, SESSION_TTL_MS } from '../domain/session-token';
import { signInWithSso } from './sign-in-with-sso';
import { MAX_ACTIVE_USERS } from '../domain/user-limit';

const NOW = new Date('2026-09-17T10:00:00Z');
const IDENTITY = { subject: 'authentik-sub-1', displayName: 'Thịnh' };

function deps() {
  return {
    users: inMemorySsoUsers(),
    sessions: inMemorySessions(),
    userCounter: userCounterAt(0),
    now: () => NOW,
  };
}

describe('signInWithSso', () => {
  it('TC-021: lần đầu tạo user Just-In-Time và mở phiên 14 ngày', async () => {
    const d = deps();

    const result = await signInWithSso(d, IDENTITY);

    expect(d.users.created).toEqual([IDENTITY]);
    expect(result.session).toEqual({
      userId: 'user-1',
      expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS),
    });
    expect(d.sessions.rows.get(hashSessionToken(result.token))).toEqual(result.session);
  });

  it('lần sau dùng lại user cũ, mỗi lần đăng nhập một phiên riêng', async () => {
    const d = deps();

    const first = await signInWithSso(d, IDENTITY);
    const second = await signInWithSso(d, IDENTITY);

    expect(d.users.created).toHaveLength(1);
    expect(second.session.userId).toBe(first.session.userId);
    expect(second.token).not.toBe(first.token);
    expect(d.sessions.rows.size).toBe(2);
  });

  it('không lưu token gốc vào repository', async () => {
    const d = deps();

    const { token } = await signInWithSso(d, IDENTITY);

    expect(d.sessions.rows.has(token)).toBe(false);
  });

  it('TC-023: đủ 10 user thì subject mới bị chặn, không tạo user cũng không mở phiên', async () => {
    const d = { ...deps(), userCounter: userCounterAt(MAX_ACTIVE_USERS) };

    await expect(signInWithSso(d, IDENTITY)).rejects.toMatchObject({
      code: 'ERR_USER_LIMIT_REACHED',
    });
    expect(d.users.created).toHaveLength(0);
    expect(d.sessions.rows.size).toBe(0);
  });

  it('hệ thống đầy vẫn cho user SSO đã có đăng nhập lại', async () => {
    const d = deps();
    const first = await signInWithSso(d, IDENTITY);
    d.userCounter.total = MAX_ACTIVE_USERS;

    const again = await signInWithSso(d, IDENTITY);

    expect(again.session.userId).toBe(first.session.userId);
  });
});
