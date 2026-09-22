import { useLayoutEffect, useRef } from 'react';

import { Field } from '@src/shared/ui/Field/Field';

import { applyCardFormat, type CardFormat } from '../domain/cardFormatting';

import './CardTextEditor.css';

const TOOLS: Record<CardFormat, { label: string; glyph: string }> = {
  bold: { label: 'In đậm', glyph: 'B' },
  italic: { label: 'In nghiêng', glyph: 'I' },
  code: { label: 'Mã', glyph: '</>' },
  cloze: { label: 'Cloze — đục lỗ đoạn đã chọn', glyph: 'Cloze [..]' },
};

/** Từ 90% trần trở lên, bộ đếm đổi màu để người dùng kịp rút gọn. */
const NEAR_LIMIT_RATIO = 0.9;

type CardTextEditorProps = {
  label: string;
  hint?: string | undefined;
  description?: string;
  error?: string | undefined;
  /** Chấm màu trước nhãn: vàng cho mặt hỏi, xanh cho mặt trả lời (design 0.1.2). */
  tone?: 'front' | 'back';
  value: string;
  maxLength: number;
  rows: number;
  placeholder: string;
  formats?: readonly CardFormat[];
  toolbarHint?: string;
  onValueChange: (value: string) => void;
};

export function CardTextEditor({
  label,
  hint,
  description,
  error,
  tone,
  value,
  maxLength,
  rows,
  placeholder,
  formats = [],
  toolbarHint,
  onValueChange,
}: CardTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Ô có điều khiển đẩy con trỏ về cuối mỗi khi value đổi, nên vùng chọn sau
  // khi định dạng phải đặt lại sau lúc React ghi giá trị mới vào DOM.
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const selection = pendingSelection.current;
    if (!textarea || !selection) return;

    pendingSelection.current = null;
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);
  }, [value]);

  function applyFormat(format: CardFormat) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const next = applyCardFormat(
      { value, start: textarea.selectionStart, end: textarea.selectionEnd },
      format,
    );
    // maxLength của textarea chỉ chặn gõ tay, không chặn giá trị gán bằng code.
    if (next.value.length > maxLength) return;

    pendingSelection.current = { start: next.start, end: next.end };
    onValueChange(next.value);
  }

  const nearLimit = value.length >= maxLength * NEAR_LIMIT_RATIO;

  return (
    <div className={`card-text-editor ${tone ? `card-text-editor--${tone}` : ''}`}>
      <Field
        label={label}
        hint={hint}
        description={description}
        error={error}
        aside={
          <span
            className={`card-text-editor__count text-caption ${
              nearLimit ? 'card-text-editor__count--near' : ''
            }`}
          >
            {value.length}/{maxLength}
          </span>
        }
      >
        {(props) => (
          <div className="card-text-editor__box">
            {formats.length > 0 ? (
              <div
                className="card-text-editor__toolbar"
                role="toolbar"
                aria-label={`Định dạng ${label.toLowerCase()}`}
              >
                {formats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    className={`card-text-editor__tool card-text-editor__tool--${format}`}
                    aria-label={TOOLS[format].label}
                    title={TOOLS[format].label}
                    // Giữ focus và vùng chọn ở ô nhập khi bấm nút.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyFormat(format)}
                  >
                    {TOOLS[format].glyph}
                  </button>
                ))}
                {toolbarHint ? (
                  <span className="card-text-editor__toolbar-hint text-caption">{toolbarHint}</span>
                ) : null}
              </div>
            ) : null}
            <textarea
              {...props}
              ref={textareaRef}
              rows={rows}
              placeholder={placeholder}
              maxLength={maxLength}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
            />
          </div>
        )}
      </Field>
    </div>
  );
}
