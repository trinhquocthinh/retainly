import { randomInt } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  displayNameFromEmail,
  generateTemporaryPassword,
  isStrongPassword,
  normalizeEmail,
} from './local-credentials';

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

describe('generateTemporaryPassword', () => {
  it('TC-075: 16 ký tự, luôn đạt SPEC-011, không có ký tự dễ đọc nhầm', () => {
    for (let run = 0; run < 200; run++) {
      const password = generateTemporaryPassword((max) => randomInt(max));

      expect([...password]).toHaveLength(16);
      expect(isStrongPassword(password)).toBe(true);
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });

  it.each([
    ['luôn trả 0', () => 0],
    ['luôn trả giá trị lớn nhất', (max: number) => max - 1],
  ])('random %s vẫn đủ bốn loại ký tự', (_, random) => {
    expect(isStrongPassword(generateTemporaryPassword(random))).toBe(true);
  });
});
