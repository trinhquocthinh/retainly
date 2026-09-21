import { hasCloze } from '@src/shared/ui/Markdown/MarkdownSyntax';

/** Ghi chú là tuỳ chọn; để trống thì coi như không có (máy chủ lưu null). */
export type CardDraft = { front: string; back: string; note: string };
export type CardField = keyof CardDraft;

const FIELD_BY_ERROR_CODE: Record<string, CardField> = {
  ERR_EMPTY_FRONT: 'front',
  ERR_EMPTY_BACK: 'back',
};

/**
 * Thẻ gửi được khi mặt hỏi còn nội dung sau khi bỏ khoảng trắng (BR-011), và mặt
 * trả lời cũng vậy — trừ thẻ đục lỗ, nơi mặt trả lời là tuỳ chọn (BR-025).
 */
export function isDraftComplete(draft: CardDraft): boolean {
  if (draft.front.trim().length === 0) return false;
  return draft.back.trim().length > 0 || hasCloze(draft.front);
}

/** Mã lỗi nghiệp vụ nào thuộc về ô nhập nào (SDD SPEC-002). */
export function fieldForErrorCode(code: string): CardField | undefined {
  return FIELD_BY_ERROR_CODE[code];
}
