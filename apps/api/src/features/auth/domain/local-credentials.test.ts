import { randomInt } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { generateTemporaryPassword, makeDisplayName, normalizeEmail } from './local-credentials';
import { isStrongPassword } from './password-policy';

describe('normalizeEmail', () => {
  it('bỏ khoảng trắng hai đầu và đưa về chữ thường', () => {
    expect(normalizeEmail('  Thinh@Example.COM ')).toBe('thinh@example.com');
  });
});

describe('makeDisplayName', () => {
  it('TC-078: bỏ khoảng trắng hai đầu và gộp khoảng trắng thừa giữa các chữ', () => {
    expect(makeDisplayName('  Nguyễn   Văn\tA ', 'a@example.com')).toBe('Nguyễn Văn A');
  });

  it.each([
    ['không nhập', undefined],
    ['chỉ toàn khoảng trắng', ' \n '],
  ])('TC-078: %s thì lấy phần trước @ của email', (_name, input) => {
    expect(makeDisplayName(input, 'thinh.quoc@example.com')).toBe('thinh.quoc');
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
