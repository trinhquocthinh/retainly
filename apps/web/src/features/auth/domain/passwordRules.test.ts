import { describe, expect, it } from 'vitest';

import { passwordStrength } from './passwordRules';

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
