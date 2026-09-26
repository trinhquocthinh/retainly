import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';

import { Button } from '@src/shared/ui/Button/Button';
import { IconCheck, IconChevronDown, IconLightbulb } from '@src/shared/ui/Icons/Icons';
import { hasCloze } from '@src/shared/ui/Markdown/MarkdownSyntax';

import type { CardDraft, CardField } from '../../../domain/cardDraft';
import { CardTextEditor } from '../CardTextEditor/CardTextEditor';

import './CreateCardForm.css';

const FRONT_FORMATS = ['bold', 'italic', 'code', 'cloze'] as const;
const BACK_FORMATS = ['bold', 'italic', 'code'] as const;

type CreateCardFormProps = {
  topicSelector: ReactNode;
  draft: CardDraft;
  canSave: boolean;
  saving: boolean;
  banner: string | null;
  errorOf: (field: CardField) => string | undefined;
  onFieldChange: (field: CardField, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function CreateCardForm({
  topicSelector,
  draft,
  canSave,
  saving,
  banner,
  errorOf,
  onFieldChange,
  onSubmit,
  onCancel,
}: CreateCardFormProps) {
  const noteId = useId();
  const [noteOpen, setNoteOpen] = useState(false);
  // Thẻ đục lỗ lấy câu đã điền làm đáp án, mặt sau chỉ còn là phần bổ sung (BR-025).
  const cloze = hasCloze(draft.front);

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

      {topicSelector}

      <CardTextEditor
        label="Mặt hỏi"
        tone="front"
        error={errorOf('front')}
        value={draft.front}
        maxLength={2000}
        rows={3}
        placeholder="Viết câu hỏi giúp bạn tự nhớ lại điều vừa học…"
        formats={FRONT_FORMATS}
        onValueChange={(value) => onFieldChange('front', value)}
      />

      <CardTextEditor
        label="Mặt trả lời"
        hint={cloze ? 'tuỳ chọn' : undefined}
        tone="back"
        error={errorOf('back')}
        value={draft.back}
        maxLength={2000}
        rows={4}
        placeholder={cloze ? 'Thông tin bổ sung, hiện dưới câu đã điền…' : 'Câu trả lời ngắn gọn…'}
        formats={BACK_FORMATS}
        toolbarHint="Ngắn gọn, dễ đọc lướt"
        onValueChange={(value) => onFieldChange('back', value)}
      />

      <div className="create-card__note">
        <button
          type="button"
          className={`create-card__note-toggle text-small ${
            noteOpen ? 'create-card__note-toggle--open' : ''
          }`}
          aria-expanded={noteOpen}
          aria-controls={noteId}
          onClick={() => setNoteOpen((open) => !open)}
        >
          <IconLightbulb />
          <span>Thêm mẹo ghi nhớ hoặc ghi chú phụ</span>
          {!noteOpen && draft.note.trim() ? (
            <span className="compact-chip compact-chip--subtle text-caption">Đã nhập</span>
          ) : null}
          <span className="create-card__note-chevron">
            <IconChevronDown />
          </span>
        </button>
        <div id={noteId} hidden={!noteOpen}>
          <CardTextEditor
            label="Ghi chú"
            hint="không bắt buộc"
            description="Thêm giải thích hoặc liên tưởng giúp bạn nhớ lâu hơn."
            value={draft.note}
            maxLength={1000}
            rows={2}
            placeholder="Ví dụ, ngữ cảnh hoặc liên tưởng dễ nhớ…"
            onValueChange={(value) => onFieldChange('note', value)}
          />
        </div>
      </div>

      <div className="create-card__actions">
        <p className="create-card__shortcut text-caption">
          <kbd className="compact-chip key-hint">Ctrl</kbd> +{' '}
          <kbd className="compact-chip key-hint">Enter</kbd> để lưu và tạo tiếp
        </p>
        <div className="create-card__buttons">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="submit" variant="primary" disabled={!canSave}>
            {saving ? (
              'Đang lưu…'
            ) : (
              <>
                <IconCheck />
                Lưu và tạo tiếp
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
