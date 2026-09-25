import { describe, expect, it } from 'vitest';

import { inMemorySessions } from '../../../shared/test/in-memory-auth';
import {
  hashSessionToken,
  REMEMBERED_SESSION_TTL_MS,
  SESSION_TTL_MS,
} from '../domain/session-token';
import { endSession, resolveSession, startSession } from './sessions';

const NOW = new Date('2026-09-17T10:00:00Z');
const TOKEN = 'token-cua-trinh-duyet';

function sessionsWith(expiresAt: Date) {
  const sessions = inMemorySessions();
  sessions.rows.set(hashSessionToken(TOKEN), { userId: 'user-1', expiresAt });
  return sessions;
}

describe('resolveSession', () => {
  it('trả phiên còn hạn, tra theo hash của token', async () => {
    const expiresAt = new Date('2026-09-18T10:00:00Z');
    const sessions = sessionsWith(expiresAt);

    await expect(resolveSession({ sessions, now: () => NOW }, TOKEN)).resolves.toEqual({
      userId: 'user-1',
      expiresAt,
      displayName: 'Người dùng user-1',
      authMethod: 'sso',
    });
  });

  it('token lạ trả null', async () => {
    const sessions = sessionsWith(new Date('2026-09-18T10:00:00Z'));

    await expect(resolveSession({ sessions, now: () => NOW }, 'token-la')).resolves.toBeNull();
  });

  it('phiên hết hạn đúng thời điểm hiện tại trả null và bị xoá', async () => {
    const sessions = sessionsWith(NOW);

    await expect(resolveSession({ sessions, now: () => NOW }, TOKEN)).resolves.toBeNull();
    expect(sessions.rows.size).toBe(0);
  });
});

describe('startSession', () => {
  it('TC-077: mặc định là phiên trình duyệt, server tự huỷ sau 24 giờ', async () => {
    const sessions = inMemorySessions();

    const started = await startSession({ sessions, now: () => NOW }, 'user-1');

    expect(started.remember).toBe(false);
    expect(started.session.expiresAt).toEqual(new Date(NOW.getTime() + SESSION_TTL_MS));
    expect(SESSION_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(sessions.rows.get(hashSessionToken(started.token))).toEqual(started.session);
  });

  it('TC-077: chọn duy trì đăng nhập thì phiên sống 30 ngày', async () => {
    const sessions = inMemorySessions();

    const started = await startSession({ sessions, now: () => NOW }, 'user-1', { remember: true });

    expect(started.remember).toBe(true);
    expect(started.session.expiresAt).toEqual(new Date(NOW.getTime() + REMEMBERED_SESSION_TTL_MS));
    expect(REMEMBERED_SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('endSession', () => {
  it('xoá phiên của token', async () => {
    const sessions = sessionsWith(new Date('2026-09-18T10:00:00Z'));

    await endSession({ sessions }, TOKEN);

    expect(sessions.rows.size).toBe(0);
  });
});
