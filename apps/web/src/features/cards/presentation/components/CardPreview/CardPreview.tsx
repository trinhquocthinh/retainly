import { useId, useState } from 'react';

import { ReviewCard } from '@src/features/review/presentation/components/ReviewCard/ReviewCard';
import { Button } from '@src/shared/ui/Button/Button';
import { IconEye, IconFlip } from '@src/shared/ui/Icons/Icons';

import type { CardDraft } from '../../../domain/cardDraft';

import './CardPreview.css';

/**
 * Xem trước bằng chính thẻ của màn ôn, để thứ người dùng thấy lúc soạn là thứ
 * họ sẽ gặp khi ôn — kể cả chỗ trống của thẻ đục lỗ và ô Ghi chú.
 */
export function CardPreview({ draft }: { draft: CardDraft }) {
  const titleId = useId();
  const [flipped, setFlipped] = useState(false);
  const empty = draft.front.trim().length === 0;

  // Lưu xong form trống lại: thẻ kế tiếp luôn bắt đầu từ mặt hỏi.
  if (empty && flipped) setFlipped(false);

  const flip = () => setFlipped((current) => !current);

  return (
    <section className="card-preview surface-panel" aria-labelledby={titleId}>
      <div className="card-preview__header">
        <h2 id={titleId} className="card-preview__title text-h2">
          <IconEye />
          Mô phỏng thẻ thực tế
        </h2>
        <span className="card-preview__caption text-caption">(Bấm thẻ để lật)</span>
        <Button onClick={flip} disabled={empty}>
          <IconFlip />
          Lật thẻ
        </Button>
      </div>

      {empty ? (
        <p className="card-preview__empty text-small">
          Gõ mặt hỏi để xem thẻ sẽ hiện ra thế nào khi ôn.
        </p>
      ) : (
        <ReviewCard
          card={{
            id: 'preview',
            front: draft.front,
            back: draft.back,
            note: draft.note.trim() ? draft.note : null,
            dueDate: '',
          }}
          flipped={flipped}
          onFlip={flip}
        />
      )}
    </section>
  );
}
