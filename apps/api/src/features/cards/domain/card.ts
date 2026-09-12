import { AppError } from '../../../shared/errors';

export type CardContent = { front: string; back: string };

/**
 * Chuẩn hoá và kiểm tra nội dung hai mặt thẻ (SPEC-002, BR-011).
 * Trim trước khi kiểm rỗng: chuỗi toàn khoảng trắng là rỗng theo nghĩa nghiệp vụ.
 * Giới hạn trên 2000 ký tự do JSON schema ở tầng presentation chặn.
 */
export function makeCardContent(input: { front: string; back: string }): CardContent {
  const front = input.front.trim();
  const back = input.back.trim();

  if (front.length === 0) throw new AppError('ERR_EMPTY_FRONT');
  if (back.length === 0) throw new AppError('ERR_EMPTY_BACK');

  return { front, back };
}
