import { describe, expect, it } from 'vitest';

import { hashSessionToken, newSessionToken } from './session-token';

describe('session token', () => {
  it('sinh token base64url 32 byte, mỗi lần một khác', () => {
    const first = newSessionToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSessionToken()).not.toBe(first);
  });

  it('hash ổn định, dạng sha256 hex và không để lộ token gốc', () => {
    const token = newSessionToken();

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).not.toContain(token);
  });
});
