/** SPEC-011: mật khẩu tài khoản nội bộ tối thiểu 8 ký tự. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash Argon2id hợp lệ của một mật khẩu ngẫu nhiên không ai biết. Đăng nhập bằng
 * email không tồn tại vẫn verify với hash này để thời gian phản hồi không để lộ
 * email nào đã đăng ký. Tham số m/t/p phải giống hash thật thì thời gian mới khớp.
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$8oA7WH6aM1SL/xYlBvOnig$CfPuBe2QANe7DaQgZRppC90BHFXAh8e2IowHANBG9Cs';

/** Đếm theo code point: emoji hay ký tự ngoài BMP tính là 1, không phải 2. */
export function isStrongPassword(password: string): boolean {
  return [...password].length >= MIN_PASSWORD_LENGTH;
}

/** Email không phân biệt hoa/thường; DB lưu dạng đã chuẩn hoá để `@unique` có tác dụng. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Tên hiển thị mặc định khi đăng ký nội bộ: phần trước `@`. */
export function displayNameFromEmail(email: string): string {
  return email.slice(0, email.indexOf('@'));
}
