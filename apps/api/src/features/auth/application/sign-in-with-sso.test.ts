import { describe, expect, it } from 'vitest';

import { inMemorySessions, inMemorySsoUsers } from '../../../shared/test/in-memory-auth';
import { hashSessionToken, SESSION_TTL_MS } from '../domain/session-token';
import { signInWithSso } from './sign-in-with-sso';

const NOW = new Date('2026-09-17T10:00:00Z');
const IDENTITY = { subject: 'authentik-sub-1', displayName: 'Thịnh' };

function deps() {
  return { users: inMemorySsoUsers(), sessions: inMemorySessions(), now: () => NOW };
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
});
