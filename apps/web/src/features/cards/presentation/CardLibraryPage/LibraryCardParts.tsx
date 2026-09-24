import { IconClock, IconDelete, IconEdit } from '@src/shared/ui/Icons/Icons';
import { InlineMarkdown } from '@src/shared/ui/Markdown/InlineMarkdown';
import { stripMarkdown } from '@src/shared/ui/Markdown/MarkdownSyntax';

import { describeDue, type CardListItem } from '../../domain/cardLibrary';

import './LibraryCardParts.css';

/** Mảnh giao diện dùng chung cho cả Lưới lẫn Bảng, để hai kiểu xem luôn hiện giống nhau. */

export function TopicBadge({ card }: { card: CardListItem }) {
  return (
    <span className={card.topic ? 'library-topic' : 'library-topic library-topic--none'}>
      {card.topic?.name ?? 'Chưa gán'}
    </span>
  );
}

export function DueBadge({ card, now }: { card: CardListItem; now: Date }) {
  const due = describeDue(card.schedule, now);

  return (
    <span className={`library-due library-due--${due.tone}`}>
      <IconClock />
      {due.label}
    </span>
  );
}

export function CardAnswer({
  card,
  id,
  hidden,
}: {
  card: CardListItem;
  id: string;
  hidden?: boolean;
}) {
  return (
    <div id={id} className="library-answer" hidden={hidden}>
      {card.back !== '' ? (
        <p>
          <InlineMarkdown text={card.back} />
        </p>
      ) : null}
      {card.note !== null ? (
        <p className="library-answer__note text-caption">
          <strong>Ghi chú: </strong>
          <InlineMarkdown text={card.note} />
        </p>
      ) : null}
    </div>
  );
}

type CardActionsProps = {
  card: CardListItem;
  onEdit: () => void;
  onDelete: () => void;
};

export function CardActions({ card, onEdit, onDelete }: CardActionsProps) {
  const title = stripMarkdown(card.front);

  return (
    <>
      <button
        type="button"
        className="card-library__icon-button"
        aria-label={`Sửa thẻ “${title}”`}
        onClick={onEdit}
      >
        <IconEdit />
      </button>
      <button
        type="button"
        className="card-library__icon-button card-library__icon-button--danger"
        aria-label={`Xoá thẻ “${title}”`}
        onClick={onDelete}
      >
        <IconDelete />
      </button>
    </>
  );
}
