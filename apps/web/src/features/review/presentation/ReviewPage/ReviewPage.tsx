import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { useReviewSession } from '../../application/useReviewSession';
import { fetchDueCards, recordOutcome } from '../../infrastructure/reviewApi';
import { ReviewSession } from '../ReviewSession/ReviewSession';
import { ReviewMessage, ReviewSkeleton } from '../ReviewStates/ReviewStates';

export function ReviewPage() {
  const navigate = useNavigate();
  const onFinish = useCallback(() => navigate('/'), [navigate]);

  const session = useReviewSession({ fetchDueCards, recordOutcome, onFinish });

  if (session.loading) return <ReviewSkeleton />;

  if (session.loadFailed) {
    return (
      <ReviewMessage
        title="Không tải được danh sách thẻ"
        note="Kiểm tra mạng rồi thử lại."
        actionLabel="Thử lại"
        onAction={session.reload}
      />
    );
  }

  if (!session.card) {
    return (
      <ReviewMessage
        title="Xong rồi!"
        note="Không còn thẻ cần ôn hôm nay."
        actionLabel="Về trang chủ"
        onAction={onFinish}
      />
    );
  }

  return <ReviewSession {...session} card={session.card} onFinish={onFinish} />;
}
