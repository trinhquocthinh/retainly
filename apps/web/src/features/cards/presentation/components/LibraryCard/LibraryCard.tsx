import { useState } from 'react';

import { IconEye, IconEyeOff } from '@src/shared/ui/Icons/Icons';
import { InlineMarkdown } from '@src/shared/ui/Markdown/InlineMarkdown';

import { describeMemoryFacts, hasAnswer, type CardListItem } from '../../../domain/cardLibrary';
import {
  CardActions,
  CardAnswer,
  DueBadge,
  TopicBadge,
} from '../LibraryCardParts/LibraryCardParts';

import './LibraryCard.css';

type LibraryCardProps = {
  card: CardListItem;
  now: Date;
  onEdit: () => void;
  onDelete: () => void;
};

function MemorySummary({ card, now }: { card: CardListItem; now: Date }) {
  const facts = describeMemoryFacts(card.schedule, now);

  if (facts === null) {
    return <p className="library-card__memory text-caption">Chưa ôn lần nào</p>;
  }

  return (
    <p className="library-card__memory text-caption">
      <span>
        <abbr title="Độ ổn định">S</abbr> {facts.stability}
      </span>
      <span>
        <abbr title="Độ khó">D</abbr> {facts.difficulty}
      </span>
      <span>Ôn gần nhất {facts.lastReview}</span>
    </p>
  );
}

export function LibraryCard({ card, now, onEdit, onDelete }: LibraryCardProps) {
  const [revealed, setRevealed] = useState(false);
  const answerId = `library-card-answer-${card.id}`;

  return (
    <article className="library-card surface-panel">
      <div className="library-card__meta">
        <TopicBadge card={card} />
        <DueBadge card={card} now={now} />
      </div>

      <h2 className="library-card__front">
        <InlineMarkdown text={card.front} />
      </h2>

      {card.source ? (
        <p className="library-card__source text-caption">Nguồn: {card.source.title}</p>
      ) : null}

      {hasAnswer(card) ? <CardAnswer card={card} id={answerId} hidden={!revealed} /> : null}

      <footer className="library-card__footer">
        <MemorySummary card={card} now={now} />

        <div className="library-card__actions">
          {hasAnswer(card) ? (
            <button
              type="button"
              className="library-card__reveal text-small"
              aria-expanded={revealed}
              aria-controls={answerId}
              onClick={() => setRevealed((current) => !current)}
            >
              {revealed ? <IconEyeOff /> : <IconEye />}
              {revealed ? 'Ẩn đáp án' : 'Xem đáp án'}
            </button>
          ) : null}

          <CardActions card={card} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </footer>
    </article>
  );
}
