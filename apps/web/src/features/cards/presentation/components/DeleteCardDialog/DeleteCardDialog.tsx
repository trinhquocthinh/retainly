import { useEffect } from 'react';

import { ApiError, NetworkError, TimeoutError } from '@src/shared/api/client';
import { Button } from '@src/shared/ui/Button/Button';
import { IconDelete } from '@src/shared/ui/Icons/Icons';
import { stripMarkdown } from '@src/shared/ui/Markdown/MarkdownSyntax';

import type { CardListItem } from '../../../domain/cardLibrary';

import '../CardDialog/CardDialog.css';

type DeleteCardDialogProps = {
  card: CardListItem;
  deleting: boolean;
  error: unknown;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

function messageFor(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof NetworkError) return 'Chưa thể kết nối. Thẻ vẫn được giữ nguyên.';
  if (error instanceof TimeoutError) return 'Phản hồi mất nhiều thời gian. Hãy kiểm tra lại thẻ.';
  if (error instanceof ApiError && error.code === 'ERR_CARD_NOT_FOUND') {
    return 'Thẻ không còn tồn tại hoặc bạn không có quyền xoá thẻ này';
  }
  return error instanceof Error ? error.message : 'Không xoá được thẻ, thử lại sau';
}

export function DeleteCardDialog({
  card,
  deleting,
  error,
  onCancel,
  onConfirm,
}: DeleteCardDialogProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) onCancel();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [deleting, onCancel]);

  return (
    <div
      className="card-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel();
      }}
    >
      <section
        className="card-dialog surface-raised card-dialog--delete"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-card-title"
        aria-describedby="delete-card-description"
      >
        <header className="card-dialog__header card-dialog__header--danger">
          <span className="card-dialog__icon card-dialog__icon--danger" aria-hidden="true">
            <IconDelete />
          </span>
          <div>
            <h2 id="delete-card-title" className="text-h2">
              Xoá thẻ này vĩnh viễn?
            </h2>
            <p className="card-dialog__danger-label text-caption">Hành động không thể hoàn tác</p>
          </div>
        </header>

        <div className="card-dialog__delete-body">
          <p id="delete-card-description" className="text-small">
            Thẻ cùng toàn bộ lịch sử ôn liên quan sẽ bị xoá.
          </p>
          <blockquote className="card-dialog__preview text-small">
            “{stripMarkdown(card.front)}”
          </blockquote>

          {messageFor(error) ? (
            <p className="feedback-danger text-small" role="alert">
              {messageFor(error)}
            </p>
          ) : null}
        </div>

        <footer className="card-dialog__footer card-dialog__footer--end">
          <Button autoFocus disabled={deleting} onClick={onCancel}>
            Giữ lại thẻ
          </Button>
          <Button variant="danger" disabled={deleting} onClick={() => void onConfirm()}>
            {deleting ? 'Đang xoá…' : 'Xoá thẻ'}
          </Button>
        </footer>
      </section>
    </div>
  );
}
