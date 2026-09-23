import type { ReactNode } from 'react';

import { Button } from '@src/shared/ui/Button/Button';

import './ReviewStates.css';

export function ReviewSkeleton() {
  return <div className="review-skeleton" role="status" aria-label="Đang tải thẻ đến hạn" />;
}

type ReviewMessageProps = {
  title: string;
  note: string;
  actionLabel: string;
  onAction: () => void;
  /** Nút đứng cạnh hành động chính, ví dụ mời Ôn thêm ở màn hoàn thành phiên. */
  extraAction?: ReactNode;
  children?: ReactNode;
};

export function ReviewMessage({
  title,
  note,
  actionLabel,
  onAction,
  extraAction,
  children,
}: ReviewMessageProps) {
  return (
    <div className="review-message">
      <p className="text-h2">{title}</p>
      <p className="review-message__note text-small">{note}</p>
      <div className="review-message__actions">
        <Button onClick={onAction}>{actionLabel}</Button>
        {extraAction}
      </div>
      {children}
    </div>
  );
}
