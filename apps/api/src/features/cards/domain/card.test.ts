import { describe, it, expect } from 'vitest';

import { makeCardContent, makeCardBack, makeCardFront } from './card';
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

describe('E3-S1-T2 — luật cập nhật nội dung thẻ', () => {
  it('chuẩn hóa riêng front để hỗ trợ cập nhật từng phần', () => {
    expect(makeCardFront('  Câu hỏi đã sửa  ')).toBe('Câu hỏi đã sửa');
  });

  it('TC-027: front rỗng sau khi trim thì trả ERR_EMPTY_FRONT', () => {
    expect(() => makeCardFront('   ')).toThrow(new AppError('ERR_EMPTY_FRONT'));
  });

  it('chuẩn hóa riêng back để hỗ trợ cập nhật từng phần', () => {
    expect(makeCardBack('  Câu trả lời đã sửa  ')).toBe('Câu trả lời đã sửa');
  });

  it('back rỗng sau khi trim thì trả ERR_EMPTY_BACK', () => {
    expect(() => makeCardBack('   ')).toThrow(new AppError('ERR_EMPTY_BACK'));
  });
});
