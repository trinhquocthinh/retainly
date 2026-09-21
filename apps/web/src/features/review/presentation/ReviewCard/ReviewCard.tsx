import { InlineMarkdown } from '@src/shared/ui/Markdown/InlineMarkdown';

import type { DueCard } from '../../domain/review';

import './ReviewCard.css';

type ReviewCardProps = {
  card: DueCard;
  flipped: boolean;
  onFlip: () => void;
};

/**
 * Hai mặt cùng nằm trong DOM và lật bằng rotateY. Toàn bộ phần tử con là <span>
 * vì nội dung của <button> chỉ được phép là phrasing content.
 */
export function ReviewCard({ card, flipped, onFlip }: ReviewCardProps) {
  return (
    <button
      type="button"
      className={`review-card ${flipped ? 'review-card--flipped' : ''}`}
      onClick={onFlip}
      aria-label={flipped ? 'Mặt trả lời — chạm để lật lại' : 'Mặt hỏi — chạm để xem đáp án'}
    >
      <span className="review-card__inner">
        <span className="review-card__face surface-raised" aria-hidden={flipped}>
          <span className="review-card__tag text-caption-caps">Mặt hỏi</span>
          <span className="review-card__body">
            <span className="review-card__prompt">
              <InlineMarkdown text={card.front} />
            </span>
          </span>
          <span className="review-card__foot text-caption">Chạm vào thẻ để xem đáp án</span>
        </span>

        <span
          className="review-card__face review-card__face--back surface-raised"
          aria-hidden={!flipped}
        >
          <span className="review-card__tag review-card__tag--answer text-caption-caps">
            Mặt đáp án
          </span>
          <span className="review-card__body review-card__body--start">
            <span className="review-card__answer">
              <InlineMarkdown text={card.back} />
            </span>
          </span>
          <span className="review-card__foot text-caption">
            Chọn Quên hoặc Nhớ để sang thẻ kế tiếp
          </span>
        </span>
      </span>
    </button>
  );
}
