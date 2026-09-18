import { describe, expect, it } from 'vitest';

import { isStrongPassword, passwordStrength } from './passwordRules';

describe('E4-S1-T6 — luật mật khẩu SPEC-011', () => {
  it.each([
    ['Abc12!xy', true],
    ['Mậtkhẩu8!', true],
    ['Abc12!x', false],
    ['abc12!xy', false],
    ['ABC12!XY', false],
    ['Abcde!xy', false],
    ['Abc123xy', false],
  ])('"%s" đạt luật: %s', (password, expected) => {
    expect(isStrongPassword(password)).toBe(expected);
  });
});

describe('E4-S1-T6 — thanh độ mạnh', () => {
  it('chưa gõ gì thì chưa đánh giá', () => {
    expect(passwordStrength('')).toBeNull();
  });

  it.each([
    ['abc', 'weak'],
    ['abc1234', 'weak'],
    ['abc12345', 'medium'],
    ['Abc12345', 'good'],
    ['Abc12345!', 'strong'],
  ])('"%s" là %s', (password, expected) => {
    expect(passwordStrength(password)).toBe(expected);
  });
});
