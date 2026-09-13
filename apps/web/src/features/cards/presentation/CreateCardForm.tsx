import type { ChangeEvent, FormEvent } from 'react';

import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';

import type { CardDraft, CardField } from '../domain/cardDraft';

import './CreateCardForm.css';

type CreateCardFormProps = {
  draft: CardDraft;
  canSave: boolean;
  saving: boolean;
  justSaved: boolean;
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
  justSaved,
  banner,
  errorOf,
  onChange,
  onSubmit,
  onCancel,
}: CreateCardFormProps) {
  return (
    <form className="create-card" onSubmit={onSubmit} noValidate>
      <h1 className="text-h1 create-card__title">Thẻ mới</h1>

      {justSaved ? (
        <p className="create-card__status text-small" role="status">
          Đã lưu thẻ. Nhập tiếp thẻ nữa hoặc mở Thư viện thẻ.
        </p>
      ) : null}

      {banner ? (
        <p className="create-card__banner text-small" role="alert">
          {banner}
        </p>
      ) : null}

      <Field label="Mặt hỏi" error={errorOf('front')}>
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

      <Field label="Mặt trả lời" error={errorOf('back')}>
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
        <Button onClick={onCancel}>Huỷ</Button>
        <Button type="submit" variant="primary" disabled={!canSave}>
          {saving ? 'Đang lưu…' : 'Lưu thẻ'}
        </Button>
      </div>
    </form>
  );
}
