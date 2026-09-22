/** Cú pháp thanh công cụ soạn thẻ chèn được — cùng tập với `MarkdownSyntax` (B5.2, BR-025). */
export type CardFormat = 'bold' | 'italic' | 'code' | 'cloze';

/** Nội dung ô nhập cùng vùng đang chọn, theo chỉ số của `selectionStart/End`. */
export type TextSelection = { value: string; start: number; end: number };

const WRAPPERS: Record<CardFormat, { open: string; close: string; placeholder: string }> = {
  bold: { open: '**', close: '**', placeholder: 'chữ đậm' },
  italic: { open: '*', close: '*', placeholder: 'chữ nghiêng' },
  code: { open: '`', close: '`', placeholder: 'mã' },
  cloze: { open: '[[', close: ']]', placeholder: 'đáp án' },
};

/**
 * Bọc đoạn đang chọn bằng cú pháp của `format`, trả về nội dung mới và vùng chọn
 * nằm quanh phần vừa bọc. Khoảng trắng hai đầu vùng chọn để ra ngoài dấu, vì
 * `**Paris **` không còn là chữ đậm; chưa chọn gì thì chèn chữ mẫu và chọn sẵn
 * để người dùng gõ đè.
 */
export function applyCardFormat(
  { value, start, end }: TextSelection,
  format: CardFormat,
): TextSelection {
  const { open, close, placeholder } = WRAPPERS[format];
  const selected = value.slice(start, end);
  const core = selected.trim();

  const innerStart = core ? start + selected.indexOf(core) : end;
  const innerEnd = core ? innerStart + core.length : end;
  const inner = core || placeholder;

  const next = value.slice(0, innerStart) + open + inner + close + value.slice(innerEnd);
  const selectionStart = innerStart + open.length;

  return { value: next, start: selectionStart, end: selectionStart + inner.length };
}
