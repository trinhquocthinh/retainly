import { describe, expect, it } from 'vitest';

import { formatDifficulty, formatPercent, formatStability } from './format';

describe('định dạng chỉ số hiển thị', () => {
  it('phần trăm làm tròn về số nguyên', () => {
    expect(formatPercent(0.914)).toBe('91%');
    expect(formatPercent(0.8991)).toBe('90%');
  });

  it('S và D một chữ số thập phân, dấu phẩy kiểu Việt Nam', () => {
    expect(formatStability(13.83)).toBe('13,8 ngày');
    expect(formatDifficulty(2.11)).toBe('2,1');
  });
});
