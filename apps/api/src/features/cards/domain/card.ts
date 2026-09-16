import { AppError } from '../../../shared/errors';

export type CardContent = { front: string; back: string };

export function makeCardFront(front: string): string {
  const normalized = front.trim();
  if (normalized.length === 0) throw new AppError('ERR_EMPTY_FRONT');

  return normalized;
}

export function makeCardBack(back: string): string {
  const normalized = back.trim();
  if (normalized.length === 0) throw new AppError('ERR_EMPTY_BACK');

  return normalized;
}

/**
 * Chuẩn hoá và kiểm tra nội dung hai mặt thẻ (SPEC-002, BR-011).
 * Trim trước khi kiểm rỗng: chuỗi toàn khoảng trắng là rỗng theo nghĩa nghiệp vụ.
 * Giới hạn trên 2000 ký tự do JSON schema ở tầng presentation chặn.
 */
export function makeCardContent(input: { front: string; back: string }): CardContent {
  return {
    front: makeCardFront(input.front),
    back: makeCardBack(input.back),
  };
}
