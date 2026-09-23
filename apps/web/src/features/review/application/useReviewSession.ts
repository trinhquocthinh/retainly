import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  isUndoKey,
  outcomeForKey,
  type DueCard,
  type ReviewOutcome,
  type ReviewSource,
} from '../domain/review';
import { isRetryable } from '@src/shared/api/client';

type QueuePorts = {
  fetchDueCards: () => Promise<{ dueCards: DueCard[] }>;
  fetchExtraCards: () => Promise<{ extraCards: DueCard[] }>;
};

type ReviewPorts = QueuePorts & {
  source: ReviewSource;
  recordOutcome: (input: { cardId: string; outcome: ReviewOutcome }) => Promise<{
    outcomeId: string;
  }>;
  undoOutcome: (outcomeId: string) => Promise<unknown>;
  onFinish: () => void;
};

/** Lượt vừa ôn còn hoàn tác được: outcome để gọi DELETE, vị trí để quay về thẻ đó. */
type Undoable = { outcomeId: string; index: number };

/** `retry`: lỗi mạng/máy chủ, bấm lại được. `expired`: server từ chối (BR-024), thôi hẳn. */
export type UndoProblem = 'retry' | 'expired';

/**
 * Mỗi nguồn một query, chỉ query của nguồn đang ôn được bật. Hàng đợi đến hạn
 * giữ key `['cards', 'due']` và nguyên phản hồi để dùng chung cache với Trang
 * chủ và badge điều hướng.
 */
function useReviewQueue(source: ReviewSource, { fetchDueCards, fetchExtraCards }: QueuePorts) {
  // Nạp một lần đầu phiên và giữ nguyên. Làm mới giữa chừng sẽ khiến thẻ biến
  // mất hoặc đổi thứ tự ngay dưới tay người đang ôn — tech-spec §3.
  const keepForSession = { staleTime: Infinity, refetchOnWindowFocus: false } as const;

  const due = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: fetchDueCards,
    enabled: source === 'due',
    ...keepForSession,
  });
  const extra = useQuery({
    queryKey: ['cards', 'extra'],
    queryFn: fetchExtraCards,
    enabled: source === 'extra',
    ...keepForSession,
  });

  const query = source === 'extra' ? extra : due;
  const cards = source === 'extra' ? extra.data?.extraCards : due.data?.dueCards;

  return {
    cards: cards ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useReviewSession({
  source,
  fetchDueCards,
  fetchExtraCards,
  recordOutcome,
  undoOutcome,
  onFinish,
}: ReviewPorts) {
  const query = useReviewQueue(source, { fetchDueCards, fetchExtraCards });

  const {
    mutate,
    reset: resetSave,
    error: saveError,
    isPending: saving,
    isError: saveFailed,
  } = useMutation({
    mutationFn: recordOutcome,
  });

  const {
    mutate: mutateUndo,
    reset: resetUndo,
    error: undoError,
    isPending: undoing,
    isError: undoFailed,
  } = useMutation({
    mutationFn: undoOutcome,
  });

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<ReviewOutcome | null>(null);
  // Chỉ giữ một bước (US-014): lượt chấm mới ghi đè, hoàn tác xong thì xoá.
  const [undoable, setUndoable] = useState<Undoable | null>(null);

  const { cards } = query;
  const card = cards[index];
  const busy = saving || undoing;

  const onFlip = useCallback(() => setFlipped((value) => !value), []);

  const onRate = useCallback(
    (outcome: ReviewOutcome) => {
      if (!card || busy) return;

      setLastOutcome(outcome);
      resetUndo();
      mutate(
        { cardId: card.id, outcome },
        {
          onSuccess: ({ outcomeId }) => {
            setUndoable({ outcomeId, index });
            setIndex((value) => value + 1);
            setFlipped(false);
          },
        },
      );
    },
    [card, index, busy, mutate, resetUndo],
  );

  const onRetry = useCallback(() => {
    if (lastOutcome) onRate(lastOutcome);
  }, [lastOutcome, onRate]);

  /**
   * Lỗi không đáng thử lại (thẻ đã bị xoá, id không hợp lệ) thì thử lại bao
   * nhiêu lần cũng hỏng. Không có lối này thì phiên ôn kẹt cứng ở thẻ đó.
   */
  const onSkip = useCallback(() => {
    resetSave();
    // Thẻ bị bỏ qua nằm giữa lượt cũ và vị trí hiện tại: quay về lượt cũ sẽ
    // khiến nó hiện lại lần nữa, nên bỏ luôn quyền hoàn tác.
    setUndoable(null);
    setIndex((value) => value + 1);
    setFlipped(false);
  }, [resetSave]);

  /**
   * Máy khách không tự đếm 10 phút: server là nguồn sự thật cho BR-024, đồng
   * hồ máy người dùng có thể lệch.
   */
  const onUndo = useCallback(() => {
    if (!undoable || busy) return;

    resetSave();
    mutateUndo(undoable.outcomeId, {
      onSuccess: () => {
        setIndex(undoable.index);
        setFlipped(false);
        setUndoable(null);
      },
      onError: (error) => {
        if (!isRetryable(error)) setUndoable(null);
      },
    });
  }, [undoable, busy, resetSave, mutateUndo]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onFinish();
        return;
      }
      // Trước cả kiểm tra `card`: màn hoàn thành phiên cũng hoàn tác được.
      if (isUndoKey(event)) {
        onUndo();
        return;
      }
      if (!card) return;

      if (event.key === ' ') {
        // Chặn mặc định: nếu không, Space còn kích hoạt click của nút thẻ đang
        // focus, thẻ lật hai lần và quay về đúng trạng thái cũ.
        event.preventDefault();
        onFlip();
        return;
      }

      if (!flipped) return;
      const outcome = outcomeForKey(event.key);
      if (outcome) onRate(outcome);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [card, flipped, onFlip, onRate, onUndo, onFinish]);

  let undoProblem: UndoProblem | null = null;
  if (undoFailed) undoProblem = isRetryable(undoError) ? 'retry' : 'expired';

  return {
    loading: query.isPending,
    loadFailed: query.isError,
    reload: () => void query.refetch(),
    card,
    flipped,
    position: index + 1,
    reviewed: index,
    total: cards.length,
    saving: busy,
    saveFailed,
    onFlip,
    onRate,
    onRetry,
    canRetry: isRetryable(saveError),
    onSkip,
    canUndo: undoable !== null,
    undoing,
    undoProblem,
    onUndo,
  };
}
