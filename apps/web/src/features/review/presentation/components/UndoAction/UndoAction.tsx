import { IconUndo } from '@src/shared/ui/Icons/Icons';

import type { UndoProblem } from '../../../application/useReviewSession';

import './UndoAction.css';

type UndoActionProps = {
  canUndo: boolean;
  disabled: boolean;
  undoProblem: UndoProblem | null;
  onUndo: () => void;
};

/**
 * Hoàn tác lượt vừa ôn (US-014) — dùng chung cho lúc đang ôn và màn hoàn thành
 * phiên. Server từ chối thì nút biến mất nhưng lời giải thích vẫn ở lại.
 */
export function UndoAction({ canUndo, disabled, undoProblem, onUndo }: UndoActionProps) {
  if (!canUndo && undoProblem === null) return null;

  return (
    <div className="undo-action text-caption">
      {canUndo ? (
        <button type="button" className="undo-action__button" disabled={disabled} onClick={onUndo}>
          <IconUndo />
          <span>Hoàn tác lượt vừa ôn</span>
          <kbd className="compact-chip compact-chip--subtle key-hint">Z</kbd>
        </button>
      ) : null}

      {undoProblem ? (
        <p className="undo-action__error feedback-danger" role="alert">
          {undoProblem === 'retry'
            ? 'Không hoàn tác được, có thể do mạng. Thử lại nhé.'
            : 'Lượt này không còn hoàn tác được nữa (quá 10 phút hoặc đã thay đổi).'}
        </p>
      ) : null}
    </div>
  );
}
