import { useState } from 'react';

import {
  formatDifficulty,
  formatLastReview,
  formatStability,
} from '@src/features/review/domain/memory';
import { IconChevronDown } from '@src/shared/ui/Icons/Icons';
import { InlineMarkdown } from '@src/shared/ui/Markdown/InlineMarkdown';

import { hasAnswer, type CardListItem } from '../../domain/cardLibrary';
import { CardActions, CardAnswer, DueBadge, TopicBadge } from './LibraryCardParts';

import './LibraryTable.css';

const COLUMN_COUNT = 7;

type RowProps = {
  card: CardListItem;
  now: Date;
  onEdit: () => void;
  onDelete: () => void;
};

function LibraryTableRow({ card, now, onEdit, onDelete }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const answerId = `library-row-answer-${card.id}`;
  const { stability, difficulty, lastReviewedAt } = card.schedule;
  const front = (
    <span className="library-table__front-text">
      <InlineMarkdown text={card.front} />
    </span>
  );

  return (
    <>
      <tr className="library-table__row">
        <td>
          {hasAnswer(card) ? (
            <button
              type="button"
              className="library-table__toggle"
              aria-expanded={expanded}
              aria-controls={answerId}
              onClick={() => setExpanded((current) => !current)}
            >
              <IconChevronDown />
              {front}
            </button>
          ) : (
            <span className="library-table__static">{front}</span>
          )}
        </td>
        <td>
          <TopicBadge card={card} />
        </td>
        <td>
          <DueBadge card={card} now={now} />
        </td>
        {/* Thẻ chưa ôn có S = D = 0 — chưa đo được gì nên để trống. */}
        <td className="library-table__number">
          {lastReviewedAt === null ? '—' : formatStability(stability)}
        </td>
        <td className="library-table__number">
          {lastReviewedAt === null ? '—' : formatDifficulty(difficulty)}
        </td>
        <td className="library-table__last">
          {lastReviewedAt === null ? 'Chưa ôn' : formatLastReview(lastReviewedAt, now)}
        </td>
        <td>
          <div className="library-table__actions">
            <CardActions card={card} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </td>
      </tr>
      {hasAnswer(card) ? (
        <tr className="library-table__answer-row" hidden={!expanded}>
          <td colSpan={COLUMN_COUNT}>
            <CardAnswer card={card} id={answerId} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

type LibraryTableProps = {
  cards: CardListItem[];
  now: Date;
  onEdit: (card: CardListItem) => void;
  onDelete: (card: CardListItem) => void;
};

/** Kiểu xem Bảng — chỉ có trên desktop, để quét nhanh thư viện dài. */
export function LibraryTable({ cards, now, onEdit, onDelete }: LibraryTableProps) {
  return (
    <div className="library-table surface-panel surface-panel--flush">
      <table>
        <thead className="text-caption-caps">
          <tr>
            <th scope="col">Mặt hỏi</th>
            <th scope="col" className="library-table__topic-col">
              Nhánh
            </th>
            <th scope="col" className="library-table__due-col">
              Hạn ôn
            </th>
            <th scope="col" className="library-table__stability-col">
              <abbr title="Độ ổn định">S</abbr>
            </th>
            <th scope="col" className="library-table__difficulty-col">
              <abbr title="Độ khó">D</abbr>
            </th>
            <th scope="col" className="library-table__last-col">
              Ôn gần nhất
            </th>
            <th scope="col" className="library-table__actions-col">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <LibraryTableRow
              key={card.id}
              card={card}
              now={now}
              onEdit={() => onEdit(card)}
              onDelete={() => onDelete(card)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
