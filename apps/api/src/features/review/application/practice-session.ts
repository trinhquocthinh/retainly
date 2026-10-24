import { AppError } from '../../../shared/errors';
import { selectPracticeCards, type PracticeSize } from '../domain/practice-selection';
import { isWithinUndoWindow } from '../domain/undo-window';
import type { ReviewOutcome } from '../domain/review-scheduler';
import { toDueCard } from './list-due-cards';
import { recordOutcome } from './record-outcome';
import { undoOutcome } from './undo-outcome';
import type { PracticeRecord, PracticeRepository, PracticeStore } from './practice-repository';

type Dependencies = { practices: PracticeRepository; now: () => Date; random?: () => number };

function view(record: PracticeRecord, now: Date) {
  const last = [...record.items].reverse().find((item) => item.answer !== null)?.answer;
  const canUndo = !record.undoUsed && last?.id != null && isWithinUndoWindow(last.reviewedAt, now);
  return {
    ...record,
    canUndo,
    items: record.items.map((item) => ({
      ...item,
      card: item.card === null ? null : toDueCard(item.card, now),
    })),
  };
}

async function owned(store: PracticeStore, userId: string, id: string) {
  const record = await store.findSession(userId, id);
  if (record === null) throw new AppError('ERR_PRACTICE_NOT_FOUND');
  return record;
}

/** Thẻ đã xoá không chặn bài. Bài không có câu trả lời nào không tạo thành tích. */
async function reconcile(store: PracticeStore, record: PracticeRecord, now: Date) {
  if (
    record.status === 'active' &&
    record.items.every((i) => i.card === null || i.answer !== null)
  ) {
    const status = record.items.some((i) => i.answer !== null) ? 'completed' : 'abandoned';
    const closedAt =
      status === 'completed'
        ? new Date(
            Math.max(
              ...record.items.flatMap((i) =>
                i.answer === null ? [] : [i.answer.reviewedAt.getTime()],
              ),
            ),
          )
        : now;
    await store.setStatus(record.id, status, closedAt);
    return view({ ...record, status, closedAt }, now);
  }
  return view(record, now);
}

export type PracticeView = ReturnType<typeof view>;

export async function beginPractice(
  deps: Dependencies,
  input: { userId: string; size: PracticeSize; topicId?: string },
): Promise<PracticeView | null> {
  if (input.size !== 10 && input.size !== 15) throw new AppError('ERR_BAD_REQUEST');
  return deps.practices.inTransaction(input.userId, async (store) => {
    const now = deps.now();
    const active = await store.findActive(input.userId);
    if (active !== null) return reconcile(store, active, now);
    const candidates = await store.findCandidates(input.userId, now, input.topicId);
    const selected = selectPracticeCards(candidates, now, input.size, deps.random);
    if (selected.length === 0) return null;
    const record = await store.createSession({ ...input, now, cardIds: selected.map((c) => c.id) });
    return reconcile(store, record, now);
  });
}

export async function getPractice(
  deps: Dependencies,
  input: { userId: string; sessionId: string },
) {
  return deps.practices.inTransaction(input.userId, async (store) =>
    reconcile(store, await owned(store, input.userId, input.sessionId), deps.now()),
  );
}

export async function ratePractice(
  deps: Dependencies,
  input: { userId: string; sessionId: string; itemId: string; outcome: ReviewOutcome },
) {
  return deps.practices.inTransaction(input.userId, async (store) => {
    const record = await owned(store, input.userId, input.sessionId);
    const item = record.items.find((i) => i.id === input.itemId);
    if (item === undefined) throw new AppError('ERR_PRACTICE_NOT_FOUND');
    if (item.answer !== null) {
      if (item.answer.outcome !== input.outcome) throw new AppError('ERR_PRACTICE_CONFLICT');
      return reconcile(store, record, deps.now());
    }
    if (record.status !== 'active') throw new AppError('ERR_PRACTICE_CONFLICT');
    if (item.card === null) throw new AppError('ERR_CARD_NOT_FOUND');
    if (record.items.find((i) => i.card !== null && i.answer === null)?.id !== item.id) {
      throw new AppError('ERR_PRACTICE_CONFLICT');
    }
    const saved = await recordOutcome(
      { reviews: { inTransaction: (work) => work(store.reviews) }, now: deps.now },
      { userId: input.userId, cardId: item.card.card.id, outcome: input.outcome },
    );
    await store.linkAnswer(item.id, saved.outcomeId);
    return reconcile(store, await owned(store, input.userId, input.sessionId), deps.now());
  });
}

export async function undoPractice(
  deps: Dependencies,
  input: { userId: string; sessionId: string; itemId: string; outcomeId: string },
) {
  return deps.practices.inTransaction(input.userId, async (store) => {
    const record = await owned(store, input.userId, input.sessionId);
    const active = await store.findActive(input.userId);
    if (active !== null && active.id !== record.id) throw new AppError('ERR_UNDO_NOT_ALLOWED');
    const item = record.items.find((i) => i.id === input.itemId);
    if (item === undefined) throw new AppError('ERR_PRACTICE_NOT_FOUND');
    if (item.answer === null) return reconcile(store, record, deps.now());
    const latest = [...record.items].reverse().find((i) => i.answer !== null);
    if (record.undoUsed || latest?.id !== item.id || item.answer.id !== input.outcomeId)
      throw new AppError('ERR_UNDO_NOT_ALLOWED');
    await undoOutcome(
      { reviews: { inTransaction: (work) => work(store.reviews) }, now: deps.now },
      { userId: input.userId, outcomeId: input.outcomeId, practiceSessionId: record.id },
    );
    await store.unlinkAnswer(item.id);
    await store.markUndoUsed(record.id);
    await store.setStatus(record.id, 'active', null);
    return reconcile(store, await owned(store, input.userId, input.sessionId), deps.now());
  });
}
