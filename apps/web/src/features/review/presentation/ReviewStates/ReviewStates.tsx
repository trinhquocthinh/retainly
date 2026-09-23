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
  children?: ReactNode;
};

export function ReviewMessage({
  title,
  note,
  actionLabel,
  onAction,
  children,
}: ReviewMessageProps) {
  return (
    <div className="review-message">
      <p className="text-h2">{title}</p>
      <p className="review-message__note text-small">{note}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
      {children}
    </div>
  );
}
