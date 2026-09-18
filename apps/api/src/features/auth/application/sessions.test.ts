import { describe, expect, it } from 'vitest';

import { inMemorySessions } from '../../../shared/test/in-memory-auth';
import { hashSessionToken } from '../domain/session-token';
import { endSession, resolveSession } from './sessions';

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

describe('endSession', () => {
  it('xoá phiên của token', async () => {
    const sessions = sessionsWith(new Date('2026-09-18T10:00:00Z'));

    await endSession({ sessions }, TOKEN);

    expect(sessions.rows.size).toBe(0);
  });
});
