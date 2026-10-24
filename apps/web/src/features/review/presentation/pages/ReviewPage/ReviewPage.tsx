import { useCallback } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@src/shared/ui/Button/Button';
import type { ReviewSource } from '../../../domain/review';
import { useReviewSession } from '../../../application/useReviewSession';
import {
  beginPractice,
  loadPractice,
  ratePractice,
  undoPractice,
} from '../../../infrastructure/practiceApi';
import { ReviewScreen } from '../../components/ReviewScreen/ReviewScreen';
import { ReviewSession } from '../../components/ReviewSession/ReviewSession';
import { ReviewMessage, ReviewSkeleton } from '../../components/ReviewStates/ReviewStates';
import { UndoAction } from '../../components/UndoAction/UndoAction';
import { SessionSummary } from '../../components/SessionSummary/SessionSummary';

export function ReviewPage({ source = 'due' }: { source?: ReviewSource }) {
  const { key } = useLocation();
  return <ReviewRun key={key} source={source} />;
}

function ReviewRun({ source }: { source: ReviewSource }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const { topicId } = useParams();
  const queryClient = useQueryClient();
  const invalidate = useCallback(() => {
    for (const queryKey of [['practice'], ['cards'], ['home', 'overview'], ['stats']]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient]);
  const onFinish = useCallback(() => {
    invalidate();
    navigate(source === 'topic' ? '/stats' : '/');
  }, [invalidate, navigate, source]);
  const onSession = useCallback(
    (id: string) => {
      navigate(`${location.pathname}?session=${encodeURIComponent(id)}`, {
        replace: true,
        state: location.state,
      });
    },
    [navigate, location.pathname, location.state],
  );
  const onNext = () => {
    invalidate();
    navigate(`${location.pathname}?size=15`);
  };
  const session = useReviewSession({
    sessionId: search.get('session'),
    size: search.get('size') === '10' ? 10 : 15,
    topicId: source === 'topic' ? topicId : undefined,
    begin: beginPractice,
    load: loadPractice,
    rate: ratePractice,
    undo: undoPractice,
    onSession,
    onChanged: invalidate,
    onFinish,
  });
  const topicName = (location.state as { topicName?: string } | null)?.topicName;
  const queueLabel =
    topicId !== undefined && session.session?.topicId === topicId
      ? topicName
        ? `Ôn ngay · ${topicName}`
        : 'Bài học theo chủ đề'
      : 'Bài học nhỏ';
  if (session.loading)
    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
        <ReviewSkeleton />
      </ReviewScreen>
    );
  if (session.loadFailed)
    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
        <ReviewMessage
          title="Không tải được bài học"
          note="Kiểm tra mạng rồi thử lại."
          actionLabel="Thử lại"
          onAction={session.reload}
        />
      </ReviewScreen>
    );
  if (session.session === null || session.session.status === 'abandoned')
    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
        <ReviewMessage
          title="Chưa có thêm thẻ phù hợp"
          note="Bạn có thể nghỉ hôm nay và quay lại vào ngày tiếp theo."
          actionLabel="Về trang chủ"
          onAction={onFinish}
        />
      </ReviewScreen>
    );
  if (session.session.status === 'completed')
    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
        <ReviewMessage
          title="Bạn đã hoàn thành một bài học!"
          note="Bạn có thể nghỉ tại đây hoặc chủ động học thêm một bài."
          actionLabel="Kết thúc"
          onAction={onFinish}
          details={<SessionSummary tally={session.tally} />}
          extraAction={
            <Button variant="primary" onClick={onNext}>
              Học thêm một bài
            </Button>
          }
        >
          <UndoAction
            canUndo={session.canUndo}
            disabled={session.undoing}
            undoProblem={session.undoProblem}
            onUndo={session.onUndo}
          />
        </ReviewMessage>
      </ReviewScreen>
    );
  if (!session.card)
    return (
      <ReviewScreen onExit={onFinish} queueLabel={queueLabel}>
        <ReviewMessage
          title="Bài học đã thay đổi"
          note="Tải lại để tiếp tục từ kết quả đã lưu."
          actionLabel="Tải lại"
          onAction={session.reload}
        />
      </ReviewScreen>
    );
  return (
    <ReviewScreen
      onExit={onFinish}
      queueLabel={queueLabel}
      progress={{ position: session.position, reviewed: session.reviewed, total: session.total }}
    >
      <ReviewSession {...session} card={session.card} />
    </ReviewScreen>
  );
}
