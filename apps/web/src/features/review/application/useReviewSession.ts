import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { outcomeForKey, type DueCard, type ReviewOutcome } from '../domain/review';
import { isRetryable } from '@src/shared/api/client';

type ReviewPorts = {
  fetchDueCards: () => Promise<{ dueCards: DueCard[] }>;
  recordOutcome: (input: { cardId: string; outcome: ReviewOutcome }) => Promise<unknown>;
  onFinish: () => void;
};

export function useReviewSession({ fetchDueCards, recordOutcome, onFinish }: ReviewPorts) {
  const query = useQuery({
    queryKey: ['cards', 'due'],
    queryFn: fetchDueCards,
    // Nạp một lần đầu phiên và giữ nguyên. Làm mới giữa chừng sẽ khiến thẻ biến
    // mất hoặc đổi thứ tự ngay dưới tay người đang ôn — tech-spec §3.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    mutate,
    reset: resetSave,
    error: saveError,
    isPending: saving,
    isError: saveFailed,
  } = useMutation({
    mutationFn: recordOutcome,
  });

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<ReviewOutcome | null>(null);

  const cards = query.data?.dueCards ?? [];
  const card = cards[index];

  const onFlip = useCallback(() => setFlipped((value) => !value), []);

  const onRate = useCallback(
    (outcome: ReviewOutcome) => {
      if (!card || saving) return;

      setLastOutcome(outcome);
      mutate(
        { cardId: card.id, outcome },
        {
          onSuccess: () => {
            setIndex((value) => value + 1);
            setFlipped(false);
          },
        },
      );
    },
    [card, saving, mutate],
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
    setIndex((value) => value + 1);
    setFlipped(false);
  }, [resetSave]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onFinish();
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
  }, [card, flipped, onFlip, onRate, onFinish]);

  return {
    loading: query.isPending,
    loadFailed: query.isError,
    reload: () => void query.refetch(),
    card,
    flipped,
    position: index + 1,
    reviewed: index,
    total: cards.length,
    saving,
    saveFailed,
    onFlip,
    onRate,
    onRetry,
    canRetry: isRetryable(saveError),
    onSkip,
  };
}
