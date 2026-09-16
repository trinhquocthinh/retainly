import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';

import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';

import type { CardDraft, CardField } from '../domain/cardDraft';

import './CreateCardForm.css';

type CreateCardFormProps = {
  draft: CardDraft;
  canSave: boolean;
  saving: boolean;
  banner: string | null;
  errorOf: (field: CardField) => string | undefined;
  onChange: (field: CardField) => (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function CreateCardForm({
  draft,
  canSave,
  saving,
  banner,
  errorOf,
  onChange,
  onSubmit,
  onCancel,
}: CreateCardFormProps) {
  // Ctrl/Cmd + Enter gửi form ngay từ trong ô nhập, khỏi rời tay khỏi bàn phím.
  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;

    const form = event.currentTarget;
    if (typeof form.requestSubmit === 'function') {
      event.preventDefault();
      form.requestSubmit();
    }
  }

  return (
    <form
      className="create-card__panel surface-panel"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      noValidate
    >
      {banner ? (
        <p className="create-card__banner feedback-danger text-small" role="alert">
          {banner}
        </p>
      ) : null}

      <Field
        label="Mặt hỏi"
        description="Khái niệm hoặc câu hỏi trọng tâm cần kiểm tra trí nhớ chủ động."
        error={errorOf('front')}
      >
        {(props) => (
          <textarea
            {...props}
            rows={3}
            placeholder="Câu hỏi bạn muốn nhớ được…"
            maxLength={2000}
            value={draft.front}
            onChange={onChange('front')}
          />
        )}
      </Field>

      <Field
        label="Mặt trả lời"
        description="Ngắn gọn, súc tích — tối ưu để nhận ra đáp án trong vòng 3–5 giây."
        error={errorOf('back')}
      >
        {(props) => (
          <textarea
            {...props}
            rows={4}
            placeholder="Câu trả lời ngắn gọn…"
            maxLength={2000}
            value={draft.back}
            onChange={onChange('back')}
          />
        )}
      </Field>

      <div className="create-card__actions">
        <p className="create-card__shortcut text-caption">
          <kbd className="compact-chip key-hint">Ctrl</kbd> +{' '}
          <kbd className="compact-chip key-hint">Enter</kbd> để lưu nhanh
        </p>
        <div className="create-card__buttons">
          <Button onClick={onCancel}>Huỷ</Button>
          <Button type="submit" variant="primary" disabled={!canSave}>
            {saving ? 'Đang lưu…' : 'Lưu thẻ'}
          </Button>
        </div>
      </div>
    </form>
  );
}
