import { describe, it, expect } from 'vitest';

import { makeCardContent } from './card';
import { AppError } from '../../../shared/errors';

describe('E1-S2-T3 — luật hợp lệ của nội dung thẻ', () => {
  it('cắt khoảng trắng thừa ở hai mặt', () => {
    expect(makeCardContent({ front: '  Thủ đô Pháp?  ', back: ' Paris ' })).toEqual({
      front: 'Thủ đô Pháp?',
      back: 'Paris',
    });
  });

  it('TC-005: front rỗng sau khi trim thì trả ERR_EMPTY_FRONT', () => {
    expect(() => makeCardContent({ front: '   ', back: 'Paris' })).toThrow(
      new AppError('ERR_EMPTY_FRONT'),
    );
  });

  it('TC-006: back rỗng sau khi trim thì trả ERR_EMPTY_BACK', () => {
    expect(() => makeCardContent({ front: 'Thủ đô Pháp?', back: '' })).toThrow(
      new AppError('ERR_EMPTY_BACK'),
    );
  });
});
