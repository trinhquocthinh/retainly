import { describe, expect, it } from 'vitest';

import { isStrongPassword, PASSWORD_RULES } from './password-policy';

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

describe('PASSWORD_RULES', () => {
  it('E11-S1-T2: mỗi luật chấm riêng một loại ký tự, web dùng để vẽ checklist', () => {
    const passed = PASSWORD_RULES.filter((rule) => rule.test('abc12345')).map((rule) => rule.id);

    expect(passed).toEqual(['length', 'lower', 'digit']);
  });
});
