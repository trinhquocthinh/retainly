import { describe, expect, it } from 'vitest';

import { displayNameFromEmail, isStrongPassword, normalizeEmail } from './local-credentials';

describe('isStrongPassword', () => {
  it.each([
    ['1234567', false],
    ['12345678', true],
    // 7 emoji = 14 code unit UTF-16 nhưng chỉ 7 ký tự.
    ['😀😀😀😀😀😀😀', false],
    ['mậtkhẩu8', true],
  ])('%s → %s', (password, expected) => {
    expect(isStrongPassword(password)).toBe(expected);
  });
});

describe('normalizeEmail', () => {
  it('bỏ khoảng trắng hai đầu và đưa về chữ thường', () => {
    expect(normalizeEmail('  Thinh@Example.COM ')).toBe('thinh@example.com');
  });
});

describe('displayNameFromEmail', () => {
  it('lấy phần trước @', () => {
    expect(displayNameFromEmail('thinh.quoc@example.com')).toBe('thinh.quoc');
  });
});
