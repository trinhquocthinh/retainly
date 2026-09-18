import { describe, expect, it } from 'vitest';

import { displayNameFromEmail, isStrongPassword, normalizeEmail } from './local-credentials';

describe('isStrongPassword', () => {
  it.each([
    ['Abc12!x', false],
    ['Abc12!xy', true],
    ['abc12!xy', false],
    ['ABC12!XY', false],
    ['Abcde!xy', false],
    ['Abc123xy', false],
    ['Mậtkhẩu8!', true],
    // Emoji tính là ký hiệu, và là 1 ký tự dù chiếm 2 code unit UTF-16:
    // 3 + 5 emoji = 8 ký tự (đạt), 3 + 4 emoji = 7 ký tự (chưa đạt).
    ['Aa1😀😀😀😀😀', true],
    ['Aa1😀😀😀😀', false],
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
