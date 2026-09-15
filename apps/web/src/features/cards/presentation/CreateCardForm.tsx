import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router';

import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';
import { Toast } from '@src/shared/ui/Toast/Toast';
import { IconCheck } from '@src/shared/ui/Icons/Icons';

import type { CardDraft, CardField } from '../domain/cardDraft';

import './CreateCardForm.css';

const ATOMIC_RULES = [
  'Một ý chính trên mỗi thẻ: nếu câu hỏi có hơn 3 ý con, hãy chia nhỏ thành nhiều thẻ độc lập.',
  'Hỏi trực diện: tập trung vào "Tại sao" hoặc "Cái gì" thay vì câu trả lời Có/Không.',
  'Đọc lướt nhanh: tránh các đoạn văn giải thích dài dòng ở mặt trả lời.',
];

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
    <div className="create-card">
      <nav className="create-card__breadcrumb text-caption" aria-label="Đường dẫn">
        <Link to="/cards">Thư viện</Link>
        <span aria-hidden="true">›</span>
        <span className="create-card__breadcrumb-current">Thẻ mới</span>
      </nav>

      <h1 className="text-h1 create-card__title">Thẻ mới</h1>

      <form className="create-card__panel" onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate>
        {banner ? (
          <p className="create-card__banner text-small" role="alert">
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
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> để lưu nhanh
          </p>
          <div className="create-card__buttons">
            <Button onClick={onCancel}>Huỷ</Button>
            <Button type="submit" variant="primary" disabled={!canSave}>
              {saving ? 'Đang lưu…' : 'Lưu thẻ'}
            </Button>
          </div>
        </div>
      </form>

      <aside className="create-card__rules">
        <h2 className="create-card__rules-title text-small">Quy tắc thẻ ghi nhớ nguyên tử</h2>
        <ul className="create-card__rules-list">
          {ATOMIC_RULES.map((rule) => (
            <li key={rule} className="create-card__rule text-caption">
              <IconCheck />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </aside>

      <Toast open={justSaved}>Đã lưu thẻ. Nhập tiếp thẻ nữa hoặc mở Thư viện thẻ.</Toast>
    </div>
  );
}
