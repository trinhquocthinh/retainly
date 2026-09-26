/**
 * Hash Argon2id hợp lệ của một mật khẩu ngẫu nhiên không ai biết. Đăng nhập bằng
 * email không tồn tại vẫn verify với hash này để thời gian phản hồi không để lộ
 * email nào đã đăng ký. Tham số m/t/p phải giống hash thật thì thời gian mới khớp.
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$8oA7WH6aM1SL/xYlBvOnig$CfPuBe2QANe7DaQgZRppC90BHFXAh8e2IowHANBG9Cs';

/** Mật khẩu tạm do quản trị viên cấp (BR-027) — dài gấp đôi mức tối thiểu của SPEC-011. */
const TEMPORARY_PASSWORD_LENGTH = 16;

/**
 * Mỗi nhóm ứng với một loại ký tự SPEC-011 đòi hỏi. Bỏ ký tự dễ đọc nhầm khi
 * đọc hoặc nhắn lại cho người dùng (0/O, 1/l/I) và ký hiệu dễ lẫn vào câu chữ.
 */
const TEMPORARY_PASSWORD_GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '@#%+=*-',
];

/** Số nguyên ngẫu nhiên trong [0, max). Chạy thật dùng `crypto.randomInt`. */
export type RandomInt = (max: number) => number;

/** Mật khẩu tạm luôn đạt `isStrongPassword` (./password-policy): mỗi nhóm có ít nhất một ký tự, rồi trộn đều. */
export function generateTemporaryPassword(randomInt: RandomInt): string {
  const pick = (chars: string) => chars[randomInt(chars.length)];
  const allChars = TEMPORARY_PASSWORD_GROUPS.join('');

  const chars = TEMPORARY_PASSWORD_GROUPS.map(pick);
  while (chars.length < TEMPORARY_PASSWORD_LENGTH) chars.push(pick(allChars));

  // Fisher–Yates: không trộn thì 4 ký tự đầu luôn là hoa → thường → số → ký hiệu.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/** Email không phân biệt hoa/thường; DB lưu dạng đã chuẩn hoá để `@unique` có tác dụng. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Họ và tên nhập khi đăng ký (US-019), đếm theo code point như `maxLength` của route. */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/**
 * Tên hiển thị khi đăng ký nội bộ (US-019): gộp khoảng trắng thừa. Không gửi
 * hoặc chỉ toàn khoảng trắng thì lấy phần trước `@` của email như trước v0.1.2.
 */
export function makeDisplayName(input: string | undefined, email: string): string {
  const name = input?.trim().replace(/\s+/g, ' ') ?? '';
  return name === '' ? email.slice(0, email.indexOf('@')) : name;
}
