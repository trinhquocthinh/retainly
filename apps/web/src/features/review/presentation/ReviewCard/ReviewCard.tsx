import { InlineMarkdown } from '@src/shared/ui/Markdown/InlineMarkdown';
import { IconLightbulb } from '@src/shared/ui/Icons/Icons';
import { hasCloze } from '@src/shared/ui/Markdown/MarkdownSyntax';

import { formatLastReview, formatMemory, isNewCard, type CardMemory } from '../../domain/memory';
import type { DueCard } from '../../domain/review';

import './ReviewCard.css';

type ReviewCardProps = {
  card: Omit<DueCard, 'memory'>;
  /** Không có ở màn xem trước khi soạn thẻ: thẻ chưa lưu thì chưa có lịch FSRS. */
  memory?: CardMemory;
  flipped: boolean;
  onFlip: () => void;
};

/** Chỉ số FSRS ở góc thẻ (US-016). Là <span> vì nằm trong <button> của thẻ. */
function MemoryChip({ memory }: { memory: CardMemory }) {
  if (isNewCard(memory)) {
    return <span className="review-card__memory text-caption">Thẻ mới</span>;
  }

  const { stability, difficulty, retrievability } = formatMemory(memory);
  return (
    <span
      className="review-card__memory text-caption"
      title="Độ ổn định (S) · Độ khó (D) · Khả năng nhớ lúc này (R)"
    >
      S {stability} · D {difficulty} · R {retrievability}
    </span>
  );
}

/**
 * Hai mặt cùng nằm trong DOM và lật bằng rotateY. Toàn bộ phần tử con là <span>
 * vì nội dung của <button> chỉ được phép là phrasing content.
 */
export function ReviewCard({ card, memory, flipped, onFlip }: ReviewCardProps) {
  // Thẻ đục lỗ (BR-025): đáp án là chính câu ở mặt hỏi đã điền; mặt sau nếu có
  // chỉ là thông tin bổ sung.
  const cloze = hasCloze(card.front);

  return (
    <button
      type="button"
      className={`review-card ${flipped ? 'review-card--flipped' : ''}`}
      onClick={onFlip}
      aria-label={flipped ? 'Mặt trả lời — chạm để lật lại' : 'Mặt hỏi — chạm để xem đáp án'}
    >
      <span className="review-card__inner">
        <span className="review-card__face surface-raised" aria-hidden={flipped}>
          <span className="review-card__head">
            <span className="review-card__tag text-caption-caps">Mặt hỏi</span>
            {memory ? <MemoryChip memory={memory} /> : null}
          </span>
          <span className="review-card__body">
            <span className="review-card__prompt">
              <InlineMarkdown text={card.front} cloze="blank" />
            </span>
          </span>
          <span className="review-card__foot text-caption">Chạm vào thẻ để xem đáp án</span>
        </span>

        <span
          className="review-card__face review-card__face--back surface-raised"
          aria-hidden={!flipped}
        >
          <span className="review-card__head">
            <span className="review-card__tag review-card__tag--answer text-caption-caps">
              Mặt đáp án
            </span>
            {memory ? <MemoryChip memory={memory} /> : null}
          </span>
          <span className="review-card__body review-card__body--start">
            <span className="review-card__answer">
              <InlineMarkdown text={cloze ? card.front : card.back} />
            </span>
            {cloze && card.back ? (
              <span className="review-card__extra text-small">
                <InlineMarkdown text={card.back} />
              </span>
            ) : null}
            {card.note ? (
              <span className="review-card__note">
                <span className="review-card__note-icon">
                  <IconLightbulb />
                </span>
                <span className="review-card__note-content">
                  <span className="review-card__note-label text-caption-caps">Ghi chú</span>
                  <span className="review-card__note-text text-small">
                    <InlineMarkdown text={card.note} />
                  </span>
                </span>
              </span>
            ) : null}
          </span>
          <span className="review-card__foot text-caption">{answerFoot(memory)}</span>
        </span>
      </span>
    </button>
  );
}

function answerFoot(memory: CardMemory | undefined): string {
  if (!memory) return 'Chọn Quên hoặc Nhớ để sang thẻ kế tiếp';
  if (memory.lastReviewedAt === null) return 'Lần ôn đầu tiên của thẻ này';
  return `Ôn gần nhất: ${formatLastReview(memory.lastReviewedAt, new Date())}`;
}
