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
 * Ghi chú là tuỳ chọn: trim xong mà rỗng thì coi như không có, lưu `null` chứ
 * không lưu chuỗi rỗng — một cách biểu diễn duy nhất cho "không có ghi chú".
 * Giới hạn 1000 ký tự do JSON schema chặn, cột VARCHAR(1000) chặn lần cuối.
 */
export function makeCardNote(note: string | null | undefined): string | null {
  const normalized = note?.trim() ?? '';

  return normalized.length === 0 ? null : normalized;
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
