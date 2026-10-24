import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isRetryable } from '@src/shared/api/client';
import { isUndoKey, outcomeForKey, type ReviewOutcome } from '../domain/review';
import type { PracticeResponse, PracticeSession, PracticeSize } from '../domain/practice';
import { tallySession } from '../domain/session';

export type UndoProblem = 'retry' | 'expired';
type ReviewPorts = {
  sessionId: string | null;
  size: PracticeSize;
  topicId?: string;
  begin: (input: { size: PracticeSize; topicId?: string }) => Promise<PracticeResponse>;
  load: (id: string) => Promise<PracticeResponse>;
  rate: (
    id: string,
    input: { itemId: string; outcome: ReviewOutcome },
  ) => Promise<PracticeResponse>;
  undo: (id: string, input: { itemId: string; outcomeId: string }) => Promise<PracticeResponse>;
  onSession: (id: string) => void;
  onChanged: () => void;
  onFinish: () => void;
};

export function useReviewSession({
  sessionId,
  size,
  topicId,
  begin,
  load,
  rate,
  undo,
  onSession,
  onChanged,
  onFinish,
}: ReviewPorts) {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<ReviewOutcome | null>(null);
  const save = useMutation({
    mutationFn: (input: { id: string; itemId: string; outcome: ReviewOutcome }) =>
      rate(input.id, { itemId: input.itemId, outcome: input.outcome }),
    onSuccess: onChanged,
  });
  const undoSave = useMutation({
    mutationFn: (input: { id: string; itemId: string; outcomeId: string }) =>
      undo(input.id, { itemId: input.itemId, outcomeId: input.outcomeId }),
    onSuccess: onChanged,
  });

  useEffect(() => {
    let live = true;
    const request = sessionId === null ? begin({ size, topicId }) : load(sessionId);
    void request
      .then(({ session: result }) => {
        if (!live) return;
        if (result !== null && sessionId === null) {
          onSession(result.id);
          return;
        }
        setSession(result);
        setLoading(false);
        setLoadFailed(false);
      })
      .catch(() => {
        if (live) {
          setLoading(false);
          setLoadFailed(true);
        }
      });
    return () => {
      live = false;
    };
  }, [sessionId, size, topicId, begin, load, onSession, attempt]);

  const items = session?.items.filter((item) => item.card !== null || item.answer !== null) ?? [];
  const current = items.find((item) => item.card !== null && item.answer === null);
  const answered = items.filter((item) => item.answer !== null);
  const busy = save.isPending || undoSave.isPending;
  const onFlip = useCallback(() => setFlipped((value) => !value), []);
  const onRate = useCallback(
    (outcome: ReviewOutcome) => {
      if (!session || !current || !flipped || busy) return;
      setLastOutcome(outcome);
      undoSave.reset();
      save.mutate(
        { id: session.id, itemId: current.id, outcome },
        {
          onSuccess: ({ session: next }) => {
            setSession(next);
            setFlipped(false);
          },
        },
      );
    },
    [session, current, flipped, busy, save, undoSave],
  );
  const onUndo = useCallback(() => {
    const last = answered[answered.length - 1];
    if (!session || busy || !session.canUndo || last?.answer?.id == null) return;
    save.reset();
    undoSave.mutate(
      { id: session.id, itemId: last.id, outcomeId: last.answer.id },
      {
        onSuccess: ({ session: next }) => {
          setSession(next);
          setFlipped(false);
        },
      },
    );
  }, [session, busy, answered, save, undoSave]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onFinish();
        return;
      }
      if (isUndoKey(event)) {
        onUndo();
        return;
      }
      if (!current) return;
      if (event.key === ' ') {
        event.preventDefault();
        onFlip();
        return;
      }
      const outcome = outcomeForKey(event.key);
      if (outcome && flipped) onRate(outcome);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, flipped, onFinish, onFlip, onRate, onUndo]);

  const reload = () => {
    save.reset();
    setLoading(true);
    setAttempt((value) => value + 1);
  };
  return {
    session,
    loading,
    loadFailed,
    reload,
    card: current?.card ?? undefined,
    flipped,
    saving: busy,
    position: answered.length + 1,
    reviewed: answered.length,
    total: items.length,
    tally: tallySession(items.map((item) => item.answer?.outcome ?? null)),
    saveFailed: save.isError,
    canRetry: isRetryable(save.error),
    onFlip,
    onRate,
    onRetry: () => {
      if (lastOutcome !== null) onRate(lastOutcome);
    },
    onSkip: reload,
    canUndo:
      (session?.canUndo ?? false) &&
      answered.some((item) => item.answer?.id != null) &&
      !(undoSave.isError && !isRetryable(undoSave.error)),
    undoing: undoSave.isPending,
    undoProblem: undoSave.isError
      ? ((isRetryable(undoSave.error) ? 'retry' : 'expired') as UndoProblem)
      : null,
    onUndo,
  };
}
