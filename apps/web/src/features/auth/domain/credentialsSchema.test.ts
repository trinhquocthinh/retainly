import { describe, expect, it } from 'vitest';

import {
  credentialsSchema,
  PASSWORD_MISMATCH_MESSAGE,
  WEAK_PASSWORD_MESSAGE,
  type AuthFormValues,
} from './credentialsSchema';

function messages(mode: 'login' | 'register', input: Partial<AuthFormValues>) {
  const values = {
    displayName: 'Nguyễn Văn A',
    email: 'ban@vidu.com',
    password: '',
    confirmPassword: '',
    remember: false,
    ...input,
  };
  const result = credentialsSchema(mode).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('E4-S1-T6 — schema form xác thực', () => {
  it.each(['retainly@g', 'ban vidu@x.com', '@vidu.com', 'ban@vidu.'])(
    'email "%s" không hợp lệ',
    (email) => {
      expect(messages('login', { email, password: 'x' })).toEqual([
        'Email chưa đúng định dạng, ví dụ ban@vidu.com',
      ]);
    },
  );

  it('bỏ khoảng trắng hai đầu email trước khi kiểm tra', () => {
    expect(messages('login', { email: ' Ban@Vidu.com ', password: 'x' })).toEqual([]);
  });

  it('trống thì báo cần nhập', () => {
    expect(messages('login', { email: '', password: '' })).toEqual([
      'Vui lòng nhập email',
      'Vui lòng nhập mật khẩu',
    ]);
  });

  it('đăng nhập không áp luật mật khẩu mạnh và không cần nhập lại', () => {
    expect(messages('login', { password: 'matkhaucu' })).toEqual([]);
  });

  it('đăng ký áp luật mật khẩu mạnh', () => {
    expect(messages('register', { password: 'matkhaucu', confirmPassword: 'matkhaucu' })).toEqual([
      WEAK_PASSWORD_MESSAGE,
    ]);
    expect(messages('register', { password: 'Abc12!xy', confirmPassword: 'Abc12!xy' })).toEqual([]);
  });

  it('đăng ký: mật khẩu nhập lại phải có và phải khớp', () => {
    expect(messages('register', { password: 'Abc12!xy' })).toEqual([
      'Vui lòng nhập lại mật khẩu',
      PASSWORD_MISMATCH_MESSAGE,
    ]);
    expect(messages('register', { password: 'Abc12!xy', confirmPassword: 'Abc12!xz' })).toEqual([
      PASSWORD_MISMATCH_MESSAGE,
    ]);
  });

  it.each([
    ['trống', '', 'Vui lòng nhập họ và tên'],
    ['chỉ toàn khoảng trắng', '   ', 'Vui lòng nhập họ và tên'],
    ['quá 50 ký tự', 'ă'.repeat(51), 'Họ và tên tối đa 50 ký tự'],
  ])('TC-078: đăng ký với họ và tên %s thì báo lỗi', (_name, displayName, message) => {
    expect(
      messages('register', { displayName, password: 'Abc12!xy', confirmPassword: 'Abc12!xy' }),
    ).toEqual([message]);
  });

  it('TC-078: đăng nhập không đòi họ và tên', () => {
    expect(messages('login', { displayName: '', password: 'x' })).toEqual([]);
  });
});
