import type { DueCard } from '../../domain/review';

import './ReviewCard.css';

type ReviewCardProps = {
  card: DueCard;
  flipped: boolean;
  onFlip: () => void;
};

export function ReviewCard({ card, flipped, onFlip }: ReviewCardProps) {
  return (
    <button
      type="button"
      className={`review-card ${flipped ? 'review-card--flipped' : ''}`}
      onClick={onFlip}
      aria-label={flipped ? 'Mặt trả lời — chạm để lật lại' : 'Mặt hỏi — chạm để xem đáp án'}
    >
      {flipped ? (
        <>
          <p className="review-card__question text-small">{card.front}</p>
          <hr className="review-card__divider" />
          <p className="review-card__answer">{card.back}</p>
        </>
      ) : (
        <>
          <p className="review-card__prompt">{card.front}</p>
          <p className="review-card__hint text-caption">Chạm vào thẻ để xem đáp án</p>
        </>
      )}
    </button>
  );
}
