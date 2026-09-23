import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@src/shared/ui/Button/Button';

import type { ReviewSource } from '../../domain/review';
import { useReviewSession } from '../../application/useReviewSession';
import {
  fetchDueCards,
  fetchExtraCards,
  recordOutcome,
  undoOutcome,
} from '../../infrastructure/reviewApi';
import { ReviewScreen } from '../ReviewScreen/ReviewScreen';
import { ReviewSession } from '../ReviewSession/ReviewSession';
import { ReviewMessage, ReviewSkeleton } from '../ReviewStates/ReviewStates';
import { UndoAction } from '../UndoAction/UndoAction';
import { SessionSummary } from '../SessionSummary/SessionSummary';

const QUEUE_LABEL: Record<ReviewSource, string> = {
  due: 'Thẻ đến hạn hôm nay',
  extra: 'Ôn thêm · thẻ sắp quên',
};

type ReviewPageProps = { source?: ReviewSource };

export function ReviewPage({ source = 'due' }: ReviewPageProps) {
  // Mỗi lần điều hướng vào là một phiên mới, kể cả "Ôn thêm 5 thẻ nữa" ngay
  // từ màn này: /review và /review/extra cùng component nên React sẽ giữ lại
  // vị trí thẻ của phiên trước nếu không đổi key.
  const { key } = useLocation();

  return <ReviewRun key={key} source={source} />;
}

function ReviewRun({ source }: { source: ReviewSource }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const leaveTo = useCallback(
    (path: string) => {
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
      // Xoá hẳn thay vì đánh dấu stale: dữ liệu cũ sẽ hiện ra trong lúc nạp lại
      // rồi bị thay dưới tay người ôn. Lượt sau luôn phải là 5 thẻ mới (BR-026).
      queryClient.removeQueries({ queryKey: ['cards', 'extra'] });

      navigate(path);
    },
    [navigate, queryClient],
  );

  const onFinish = useCallback(() => leaveTo('/'), [leaveTo]);
  const onExtra = useCallback(() => leaveTo('/review/extra'), [leaveTo]);

  const session = useReviewSession({
    source,
    fetchDueCards,
    fetchExtraCards,
    recordOutcome,
    undoOutcome,
    onFinish,
  });

  const queueLabel = QUEUE_LABEL[source];

  if (session.loading) {
    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
        <ReviewSkeleton />
      </ReviewScreen>
    );
  }

  if (session.loadFailed) {
    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
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
    // Ôn thêm không trả thẻ nào: không mời ôn thêm nữa, bấm lại cũng rỗng.
    if (source === 'extra' && session.total === 0) {
      return (
        <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
          <ReviewMessage
            title="Chưa có thẻ nào để ôn thêm"
            note="Thẻ chưa ôn lần nào hoặc đã ôn hôm nay không thuộc diện ôn thêm. Hẹn bạn ngày mai nhé."
            actionLabel="Về trang chủ"
            onAction={onFinish}
          />
        </ReviewScreen>
      );
    }

    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
        <ReviewMessage
          title={source === 'extra' ? 'Xong lượt ôn thêm!' : 'Xong rồi!'}
          note={
            source === 'extra'
              ? 'Kết quả đã được tính vào chuỗi ngày ôn tập.'
              : 'Không còn thẻ cần ôn hôm nay.'
          }
          actionLabel="Về trang chủ"
          onAction={onFinish}
          details={
            session.tally.reviewed > 0 ? (
              <SessionSummary tally={session.tally} elapsedMs={session.elapsedMs} />
            ) : null
          }
          extraAction={
            <Button variant="primary" onClick={onExtra}>
              {source === 'extra' ? 'Ôn thêm 5 thẻ nữa' : 'Ôn thêm 5 thẻ sắp quên'}
            </Button>
          }
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
      queueLabel={queueLabel}
      progress={{
        position: session.position,
        reviewed: session.reviewed,
        total: session.total,
        remainingMinutes: session.remainingMinutes,
      }}
    >
      <ReviewSession {...session} card={session.card} />
    </ReviewScreen>
  );
}
