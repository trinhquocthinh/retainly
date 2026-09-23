import { describe, expect, it } from 'vitest';

import { searchKeyword } from './card-search';

describe('E9-S1-T1 — searchKeyword', () => {
  it('gỡ ký hiệu định dạng và cắt khoảng trắng', () => {
    expect(searchKeyword('  **Định luật** `CAP` [[Ebbinghaus]] *x* ')).toBe(
      'Định luật CAP Ebbinghaus x',
    );
  });

  it.each([undefined, '', '   ', '**', '[[]]'])('%j không lọc', (raw) => {
    expect(searchKeyword(raw)).toBeUndefined();
  });

  it('giữ nguyên ký tự đặc biệt của LIKE — tầng SQL tự escape', () => {
    expect(searchKeyword('50%_off')).toBe('50%_off');
  });
});
