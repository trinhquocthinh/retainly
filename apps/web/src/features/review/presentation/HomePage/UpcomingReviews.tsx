import { Link } from 'react-router';

import { IconArrowRight, IconRestart } from '@src/shared/ui/Icons/Icons';
import { InlineMarkdown } from '@src/shared/ui/Markdown/InlineMarkdown';

import { describeUpcoming, type UpcomingCard } from '../../domain/home';
import { formatForecast } from '../../domain/memory';

import './UpcomingReviews.css';

/**
 * "Chu kỳ ôn kế tiếp": 3 thẻ có hạn gần nhất sau hôm nay. Chỉ hiện mặt hỏi —
 * lộ đáp án ở đây là cho người dùng xem bài trước lượt ôn.
 */
export function UpcomingReviews({ cards, now }: { cards: UpcomingCard[]; now: Date }) {
  if (cards.length === 0) return null;

  return (
    <section className="upcoming" aria-labelledby="upcoming-title">
      <div className="upcoming__head">
        <h2 id="upcoming-title" className="text-h2">
          Chu kỳ ôn kế tiếp
        </h2>
        <Link className="upcoming__all text-small" to="/cards?sort=due">
          Xem toàn bộ lịch
          <IconArrowRight />
        </Link>
      </div>

      <ul className="upcoming__list">
        {cards.map((card) => {
          const due = describeUpcoming(card.dueDate, now);

          return (
            <li key={card.id} className="upcoming__card surface-panel">
              <div className="upcoming__top">
                <span className="upcoming__topic" data-empty={card.topic === null}>
                  {card.topic?.name ?? 'Chưa gán Topic'}
                </span>
                <span className="upcoming__gap">{formatForecast(due.daysAhead)}</span>
              </div>
              <p className="upcoming__front">
                <InlineMarkdown text={card.front} cloze="blank" />
              </p>
              <div className="upcoming__foot text-caption">
                <span className="upcoming__reps">
                  <IconRestart size={14} />
                  Lặp lần {card.reps + 1}
                </span>
                <span>Dự kiến: {due.dateLabel}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
