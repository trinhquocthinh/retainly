import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

import { useReviewSession } from '../../application/useReviewSession';
import { fetchDueCards, recordOutcome, undoOutcome } from '../../infrastructure/reviewApi';
import { ReviewScreen } from '../ReviewScreen/ReviewScreen';
import { ReviewSession } from '../ReviewSession/ReviewSession';
import { ReviewMessage, ReviewSkeleton } from '../ReviewStates/ReviewStates';
import { UndoAction } from '../UndoAction/UndoAction';

export function ReviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onFinish = useCallback(() => {
    // Chỉ đánh dấu stale khi rời phiên. `refetchType: 'none'` ngăn danh sách
    // thẻ đang ôn bị nạp lại và thay đổi ngay trước khi điều hướng.
    void queryClient.invalidateQueries({
      queryKey: ['cards', 'due'],
      refetchType: 'none',
    });
    void queryClient.invalidateQueries({
      queryKey: ['review', 'streak'],
      refetchType: 'none',
    });

    navigate('/');
  }, [navigate, queryClient]);

  const session = useReviewSession({
    fetchDueCards,
    recordOutcome,
    undoOutcome,
    onFinish,
  });

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
        >
          {/* Vừa chấm nhầm thẻ cuối vẫn gỡ được, không phải quay lại từ đầu */}
          <UndoAction
            canUndo={session.canUndo}
            disabled={session.undoing}
            undoProblem={session.undoProblem}
            onUndo={session.onUndo}
          />
        </ReviewMessage>
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
