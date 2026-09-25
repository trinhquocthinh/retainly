import { describe, expect, it } from 'vitest';

import { ApiError } from '@src/shared/api/client';

import { changePasswordSchema, isWrongCurrentPassword } from './changePasswordSchema';

const VALID = {
  currentPassword: 'mat-khau-cu',
  newPassword: 'Mat-khau-moi-3',
  confirmPassword: 'Mat-khau-moi-3',
};

/** Lời báo đầu tiên của từng ô — đúng cái form hiện ra. */
function firstIssues(values: typeof VALID) {
  const result = changePasswordSchema.safeParse(values);
  const byField: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) byField[issue.path.join('.')] ??= issue.message;
  return byField;
}

describe('E11-S1-T2 — luật form đổi mật khẩu', () => {
  it('mật khẩu hiện tại chỉ cần có, không áp luật mạnh', () => {
    expect(firstIssues(VALID)).toEqual({});
  });

  it('mật khẩu mới yếu và nhập lại lệch báo đúng ô', () => {
    expect(firstIssues({ ...VALID, newPassword: 'yeu', confirmPassword: 'khac' })).toEqual({
      newPassword: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký hiệu',
      confirmPassword: 'Mật khẩu nhập lại không khớp',
    });
  });

  it('bỏ trống cả ba ô thì mỗi ô một lời nhắc', () => {
    expect(firstIssues({ currentPassword: '', newPassword: '', confirmPassword: '' })).toEqual({
      currentPassword: 'Vui lòng nhập mật khẩu hiện tại',
      newPassword: 'Vui lòng nhập mật khẩu mới',
      confirmPassword: 'Vui lòng nhập lại mật khẩu mới',
    });
  });
});

describe('isWrongCurrentPassword', () => {
  it.each([
    [new ApiError('ERR_INVALID_CREDENTIALS', 'x', 401), true],
    [new ApiError('ERR_UNAUTHORIZED', 'x', 401), false],
    [new Error('mất mạng'), false],
  ])('%s → %s', (error, expected) => {
    expect(isWrongCurrentPassword(error)).toBe(expected);
  });
});
