import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { useReviewSession } from '../../application/useReviewSession';
import { fetchDueCards, recordOutcome } from '../../infrastructure/reviewApi';
import { ReviewScreen } from '../ReviewScreen/ReviewScreen';
import { ReviewSession } from '../ReviewSession/ReviewSession';
import { ReviewMessage, ReviewSkeleton } from '../ReviewStates/ReviewStates';

export function ReviewPage() {
  const navigate = useNavigate();
  const onFinish = useCallback(() => navigate('/'), [navigate]);

  const session = useReviewSession({ fetchDueCards, recordOutcome, onFinish });

  if (session.loading) {
    return (
      <ReviewScreen onExit={onFinish}>
        <ReviewSkeleton />
      </ReviewScreen>
    );
  }

  if (session.loadFailed) {
    return (
      <ReviewScreen onExit={onFinish}>
        <ReviewMessage
          title="Không tải được danh sách thẻ"
          note="Kiểm tra mạng rồi thử lại."
          actionLabel="Thử lại"
          onAction={session.reload}
        />
      </ReviewScreen>
    );
  }

  if (!session.card) {
    return (
      <ReviewScreen onExit={onFinish}>
        <ReviewMessage
          title="Xong rồi!"
          note="Không còn thẻ cần ôn hôm nay."
          actionLabel="Về trang chủ"
          onAction={onFinish}
        />
      </ReviewScreen>
    );
  }

  return (
    <ReviewScreen
      onExit={onFinish}
      progress={{
        position: session.position,
        reviewed: session.reviewed,
        total: session.total,
      }}
    >
      <ReviewSession {...session} card={session.card} />
    </ReviewScreen>
  );
}
