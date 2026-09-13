export type CardDraft = { front: string; back: string };
export type CardField = keyof CardDraft;

const FIELD_BY_ERROR_CODE: Record<string, CardField> = {
  ERR_EMPTY_FRONT: 'front',
  ERR_EMPTY_BACK: 'back',
};

/** Thẻ gửi được khi cả hai mặt còn nội dung sau khi bỏ khoảng trắng (BR-011). */
export function isDraftComplete(draft: CardDraft): boolean {
  return draft.front.trim().length > 0 && draft.back.trim().length > 0;
}

/** Mã lỗi nghiệp vụ nào thuộc về ô nhập nào (SDD SPEC-002). */
export function fieldForErrorCode(code: string): CardField | undefined {
  return FIELD_BY_ERROR_CODE[code];
}
