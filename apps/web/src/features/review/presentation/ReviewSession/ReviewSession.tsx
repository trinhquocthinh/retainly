import { Button } from '@src/shared/ui/Button/Button';

import { progressPercent, type DueCard, type ReviewOutcome } from '../../domain/review';
import { SwipeableCard } from '../SwipeableCard/SwipeableCard';

import './ReviewSession.css';

type ReviewSessionProps = {
  card: DueCard;
  flipped: boolean;
  position: number;
  reviewed: number;
  total: number;
  saving: boolean;
  saveFailed: boolean;
  onFlip: () => void;
  onRate: (outcome: ReviewOutcome) => void;
  onRetry: () => void;
  onFinish: () => void;
};

export function ReviewSession({
  card,
  flipped,
  position,
  reviewed,
  total,
  saving,
  saveFailed,
  onFlip,
  onRate,
  onRetry,
  onFinish,
}: ReviewSessionProps) {
  return (
    <section className="review">
      <header className="review__bar">
        <Button onClick={onFinish}>✕ Kết thúc phiên</Button>
        <span className="review__counter text-small">
          {position} / {total}
        </span>
      </header>

      <div
        className="review__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reviewed}
      >
        <div
          className="review__progress-fill"
          style={{ width: `${progressPercent(reviewed, total)}%` }}
        />
      </div>

      <SwipeableCard
        card={card}
        flipped={flipped}
        enabled={flipped && !saving}
        onFlip={onFlip}
        onRate={onRate}
      />

      {saveFailed ? (
        <p className="review__error text-small" role="alert">
          Không lưu được kết quả.{' '}
          <button type="button" className="review__retry" onClick={onRetry}>
            Thử lại
          </button>
        </p>
      ) : null}

      <div className="review__actions">
        <Button variant="danger" disabled={!flipped || saving} onClick={() => onRate('forgotten')}>
          ← Quên
        </Button>
        <Button
          variant="success"
          disabled={!flipped || saving}
          onClick={() => onRate('remembered')}
        >
          Nhớ →
        </Button>
      </div>

      <p className="review__hint text-caption">
        Phím tắt: Space lật thẻ · ← Quên · → Nhớ · Esc kết thúc
      </p>
    </section>
  );
}
