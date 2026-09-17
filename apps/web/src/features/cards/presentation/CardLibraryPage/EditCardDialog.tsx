import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { ApiError, NetworkError, TimeoutError } from '@src/shared/api/client';
import { Button } from '@src/shared/ui/Button/Button';
import { Field } from '@src/shared/ui/Field/Field';
import { IconClose, IconEdit } from '@src/shared/ui/Icons/Icons';

import { fieldForErrorCode, type CardDraft, type CardField } from '../../domain/cardDraft';
import type { CardListItem, UpdateCardInput } from '../../domain/cardLibrary';

type EditCardDialogProps = {
  card: CardListItem;
  saving: boolean;
  error: unknown;
  onCancel: () => void;
  onSave: (input: UpdateCardInput) => Promise<void>;
};

function bannerFor(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError && fieldForErrorCode(error.code)) return null;
  if (error instanceof NetworkError) return 'Không kết nối được máy chủ, kiểm tra mạng rồi thử lại';
  if (error instanceof TimeoutError) return 'Máy chủ phản hồi quá lâu, thử lại sau';
  return error instanceof Error ? error.message : 'Không lưu được thay đổi, thử lại sau';
}

export function EditCardDialog({ card, saving, error, onCancel, onSave }: EditCardDialogProps) {
  const [draft, setDraft] = useState<CardDraft>({ front: card.front, back: card.back });
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onCancel();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel, saving]);

  const failedField = error instanceof ApiError ? fieldForErrorCode(error.code) : undefined;
  const canSave =
    draft.front.trim().length > 0 &&
    draft.back.trim().length > 0 &&
    (draft.front !== card.front || draft.back !== card.back) &&
    !saving;

  function errorOf(field: CardField) {
    return failedField === field ? (error as ApiError).message : undefined;
  }

  function setField(field: CardField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    void onSave(draft);
  }

  function saveOnShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    event.preventDefault();
    event.currentTarget.requestSubmit();
  }

  return (
    <div
      className="card-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <section
        className="card-dialog surface-raised card-dialog--edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-card-title"
      >
        <header className="card-dialog__header">
          <span className="card-dialog__icon card-dialog__icon--edit" aria-hidden="true">
            <IconEdit />
          </span>
          <div>
            <h2 id="edit-card-title" className="text-h2">
              Chỉnh sửa thẻ
            </h2>
            <p className="text-caption">Cập nhật nội dung mà không thay đổi lịch ôn hiện có.</p>
          </div>
          <button
            type="button"
            className="card-dialog__close"
            aria-label="Đóng hộp thoại chỉnh sửa"
            disabled={saving}
            onClick={onCancel}
          >
            <IconClose />
          </button>
        </header>

        <form className="card-dialog__form" onSubmit={submit} onKeyDown={saveOnShortcut} noValidate>
          {bannerFor(error) ? (
            <p className="feedback-danger text-small" role="alert">
              {bannerFor(error)}
            </p>
          ) : null}

          <Field label="Mặt hỏi" error={errorOf('front')}>
            {(props) => (
              <textarea
                {...props}
                ref={firstFieldRef}
                rows={3}
                maxLength={2000}
                value={draft.front}
                onChange={(event) => setField('front', event.target.value)}
              />
            )}
          </Field>

          <Field label="Mặt trả lời" error={errorOf('back')}>
            {(props) => (
              <textarea
                {...props}
                rows={4}
                maxLength={2000}
                value={draft.back}
                onChange={(event) => setField('back', event.target.value)}
              />
            )}
          </Field>

          <footer className="card-dialog__footer">
            <span className="card-dialog__shortcut text-caption">
              <kbd className="compact-chip key-hint">Ctrl</kbd> +{' '}
              <kbd className="compact-chip key-hint">Enter</kbd> để lưu
            </span>
            <div className="card-dialog__actions">
              <Button disabled={saving} onClick={onCancel}>
                Huỷ
              </Button>
              <Button type="submit" variant="primary" disabled={!canSave}>
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
