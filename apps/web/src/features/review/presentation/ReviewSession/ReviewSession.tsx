import { Button } from '@src/shared/ui/Button/Button';
import { IconArrowLeft, IconArrowRight, IconFlip } from '@src/shared/ui/Icons/Icons';

import type { UndoProblem } from '../../application/useReviewSession';
import { formatForecast } from '../../domain/memory';
import type { DueCard, ReviewOutcome } from '../../domain/review';
import { SwipeableCard } from '../SwipeableCard/SwipeableCard';
import { UndoAction } from '../UndoAction/UndoAction';

import './ReviewSession.css';

type ReviewSessionProps = {
  card: DueCard;
  flipped: boolean;
  saving: boolean;
  saveFailed: boolean;
  canRetry: boolean;
  canUndo: boolean;
  undoProblem: UndoProblem | null;
  onSkip: () => void;
  onFlip: () => void;
  onRate: (outcome: ReviewOutcome) => void;
  onRetry: () => void;
  onUndo: () => void;
};

export function ReviewSession({
  card,
  flipped,
  saving,
  saveFailed,
  canRetry,
  canUndo,
  undoProblem,
  onSkip,
  onFlip,
  onRate,
  onRetry,
  onUndo,
}: ReviewSessionProps) {
  return (
    <section className="review">
      <SwipeableCard
        card={card}
        flipped={flipped}
        enabled={flipped && !saving}
        onFlip={onFlip}
        onRate={onRate}
      />

      {saveFailed ? (
        <p className="review__error feedback-danger text-small" role="alert">
          {canRetry
            ? 'Không lưu được kết quả, có thể do mạng. '
            : 'Không lưu được kết quả cho thẻ này. '}
          <button type="button" className="review__retry" onClick={canRetry ? onRetry : onSkip}>
            {canRetry ? 'Thử lại' : 'Bỏ qua thẻ này'}
          </button>
        </p>
      ) : null}

      <button type="button" className="review__flip" onClick={onFlip}>
        <IconFlip />
        <span>{flipped ? 'Lật về mặt hỏi' : 'Lật thẻ / Xem đáp án'}</span>
        <kbd className="compact-chip key-hint">Space</kbd>
      </button>

      <div className="review__actions">
        {/* Dự báo ngay trên nút (US-016): biết trước chấm xong thẻ quay lại khi nào */}
        <Button variant="danger" disabled={!flipped || saving} onClick={() => onRate('forgotten')}>
          <IconArrowLeft />
          <span className="review__rate">
            Quên
            <span className="review__forecast">
              {formatForecast(card.memory.forecastDays.forgotten)}
            </span>
          </span>
        </Button>
        <Button
          variant="success"
          disabled={!flipped || saving}
          onClick={() => onRate('remembered')}
        >
          <span className="review__rate">
            Nhớ
            <span className="review__forecast">
              {formatForecast(card.memory.forecastDays.remembered)}
            </span>
          </span>
          <IconArrowRight />
        </Button>
      </div>

      <UndoAction canUndo={canUndo} disabled={saving} undoProblem={undoProblem} onUndo={onUndo} />
    </section>
  );
}
