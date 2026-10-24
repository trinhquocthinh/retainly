import { describe, expect, it } from 'vitest';
import { beginPractice, getPractice, ratePractice, undoPractice } from './practice-session';
import type { PracticeRecord, PracticeRepository, PracticeStore } from './practice-repository';
import { createInitialSchedule } from '../domain/review-scheduler';

const NOW = new Date('2026-10-24T03:00:00Z');

function fixture() {
  const data: PracticeRecord = {
    id: 'session',
    size: 15,
    undoUsed: false,
    topicId: null,
    status: 'active',
    createdAt: NOW,
    closedAt: null,
    items: [0, 1].map((i) => ({
      id: `item-${i}`,
      answer: null,
      card: {
        card: { id: `card-${i}`, front: `${i}`, back: 'A', note: null, dueDate: NOW },
        schedule: createInitialSchedule(NOW),
      },
    })),
  };
  let writes = 0;
  const store: PracticeStore = {
    findActive: async () => (data.status === 'active' ? data : null),
    findSession: async (user, id) => (user === 'owner' && id === data.id ? data : null),
    findCandidates: async () => [],
    createSession: async () => {
      throw new Error('phải tiếp tục bài hiện tại');
    },
    linkAnswer: async (id, outcomeId) => {
      data.items.find((item) => item.id === id)!.answer = {
        id: outcomeId,
        outcome: 'remembered',
        reviewedAt: NOW,
      };
    },
    markUndoUsed: async () => {
      data.undoUsed = true;
    },
    unlinkAnswer: async (id) => {
      data.items.find((item) => item.id === id)!.answer = null;
    },
    setStatus: async (_id, status, closedAt) => {
      data.status = status;
      data.closedAt = closedAt;
    },
    reviews: {
      lockSchedule: async (_user, cardId) =>
        data.items.find((i) => i.card?.card.id === cardId)?.card?.schedule ?? null,
      findOutcome: async (_user, id) => {
        const item = data.items.find((i) => i.answer?.id === id);
        return item?.card
          ? {
              id,
              cardId: item.card.card.id,
              reviewedAt: NOW,
              previousSchedule: createInitialSchedule(NOW),
            }
          : null;
      },
      latestOutcomeId: async (cardId) =>
        data.items.find((i) => i.card?.card.id === cardId)?.answer?.id ?? null,
      saveOutcome: async () => `outcome-${++writes}`,
      undoOutcome: async ({ outcomeId }) => {
        data.items.find((i) => i.answer?.id === outcomeId)!.answer = null;
      },
    },
  };
  const repository: PracticeRepository = {
    inTransaction: async (_user, work) => work(store),
    overview: async () => ({ activeSessionId: data.id, completedToday: 0, availableCount: 0 }),
  };
  const deps = { practices: repository, now: () => NOW, random: () => 0.5 };
  return { data, deps, writes: () => writes, store };
}

describe('vòng đời bài học', () => {
  it('bắt đầu lại tiếp tục bài đang học, không random hay tạo thêm bài', async () => {
    const { deps } = fixture();
    const first = await beginPractice(deps, { userId: 'owner', size: 15 });
    const again = await beginPractice(deps, { userId: 'owner', size: 10 });
    expect(first?.id).toBe('session');
    expect(again?.items.map((i) => i.id)).toEqual(['item-0', 'item-1']);
  });

  it('gửi lại câu trả lời không ghi FSRS hoặc outcome lần thứ hai', async () => {
    const { deps, writes } = fixture();
    const input = {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-0',
      outcome: 'remembered' as const,
    };
    await ratePractice(deps, input);
    const retry = await ratePractice(deps, input);
    expect(writes()).toBe(1);
    expect(retry.items.filter((i) => i.answer !== null)).toHaveLength(1);
  });

  it('chỉ hoàn thành sau câu cuối, Undo mở lại bài và bỏ kết quả vừa chấm', async () => {
    const { deps, data } = fixture();
    await ratePractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-0',
      outcome: 'remembered',
    });
    expect(data.status).toBe('active');
    const done = await ratePractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-1',
      outcome: 'remembered',
    });
    expect(done.status).toBe('completed');
    const undone = await undoPractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-1',
      outcomeId: 'outcome-2',
    });
    expect(undone.status).toBe('active');
    expect(undone.items[1].answer).toBeNull();
    expect(undone.closedAt).toBeNull();
  });

  it('không được ghi outcome vào bài của user khác', async () => {
    const { deps, writes } = fixture();
    await expect(
      ratePractice(deps, {
        userId: 'other',
        sessionId: 'session',
        itemId: 'item-0',
        outcome: 'remembered',
      }),
    ).rejects.toThrow('ERR_PRACTICE_NOT_FOUND');
    expect(writes()).toBe(0);
  });

  it('bài chỉ gồm thẻ đã xoá kết thúc mà không ghi nhận thành tích', async () => {
    const { deps, data } = fixture();
    data.items.forEach((item) => {
      item.card = null;
    });
    const result = await beginPractice(deps, { userId: 'owner', size: 15 });
    expect(result?.status).toBe('abandoned');
  });

  it('không Undo bài trước sau khi đã mở bài tiếp theo', async () => {
    const { deps, data, store } = fixture();
    data.items[0].answer = { id: 'outcome', outcome: 'remembered', reviewedAt: NOW };
    store.findActive = async () => ({ ...data, id: 'next-session' });
    await expect(
      undoPractice(deps, {
        userId: 'owner',
        sessionId: 'session',
        itemId: 'item-1',
        outcomeId: 'outcome-2',
      }),
    ).rejects.toThrow('ERR_UNDO_NOT_ALLOWED');
  });

  it('retry Undo chỉ hoàn tác đúng câu đã chỉ định một lần', async () => {
    const { deps, data } = fixture();
    await ratePractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-0',
      outcome: 'remembered',
    });
    await ratePractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-1',
      outcome: 'remembered',
    });
    const target = {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-1',
      outcomeId: 'outcome-2',
    };
    await undoPractice(deps, target);
    const retry = await undoPractice(deps, target);
    expect(data.items[0].answer?.id).toBe('outcome-1');
    expect(retry.items[1].answer).toBeNull();
    expect(retry.canUndo).toBe(false);
  });

  it('không nhảy cóc sang câu tiếp theo', async () => {
    const { deps, writes } = fixture();
    await expect(
      ratePractice(deps, {
        userId: 'owner',
        sessionId: 'session',
        itemId: 'item-1',
        outcome: 'remembered',
      }),
    ).rejects.toThrow('ERR_PRACTICE_CONFLICT');
    expect(writes()).toBe(0);
  });

  it('thay lựa chọn trên câu đã lưu bị từ chối; phải Undo trước', async () => {
    const { deps, writes } = fixture();
    await ratePractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-0',
      outcome: 'remembered',
    });
    await expect(
      ratePractice(deps, {
        userId: 'owner',
        sessionId: 'session',
        itemId: 'item-0',
        outcome: 'forgotten',
      }),
    ).rejects.toThrow('ERR_PRACTICE_CONFLICT');
    expect(writes()).toBe(1);
  });

  it('xoá thẻ chưa chấm không làm mất kết quả đã học của bài', async () => {
    const { deps, data } = fixture();
    await ratePractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-0',
      outcome: 'remembered',
    });
    data.items[0].card = null;
    data.items[1].card = null;
    const result = await beginPractice(deps, { userId: 'owner', size: 15 });
    expect(result?.status).toBe('completed');
    expect(result?.items[0].answer?.outcome).toBe('remembered');
  });

  it('hết cửa sổ 10 phút thì không cho Undo', async () => {
    const { deps } = fixture();
    await ratePractice(deps, {
      userId: 'owner',
      sessionId: 'session',
      itemId: 'item-0',
      outcome: 'remembered',
    });
    const later = { ...deps, now: () => new Date(NOW.getTime() + 11 * 60_000) };
    expect((await getPractice(later, { userId: 'owner', sessionId: 'session' })).canUndo).toBe(
      false,
    );
    await expect(
      undoPractice(later, {
        userId: 'owner',
        sessionId: 'session',
        itemId: 'item-0',
        outcomeId: 'outcome-1',
      }),
    ).rejects.toThrow('ERR_UNDO_NOT_ALLOWED');
  });

  it('tạo bài mới chỉ lưu tối đa 15 cardId đã chọn', async () => {
    const { deps, store, data } = fixture();
    store.findActive = async () => null;
    store.findCandidates = async () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: `new-${i}`,
        topicId: null,
        sourceId: null,
        createdAt: NOW,
        schedule: createInitialSchedule(NOW),
      }));
    store.createSession = async ({ cardIds }) => ({
      ...data,
      items: cardIds.map((id) => ({
        id: `item-${id}`,
        answer: null,
        card: {
          card: { id, front: id, back: 'Đáp', note: null, dueDate: NOW },
          schedule: createInitialSchedule(NOW),
        },
      })),
    });
    const result = await beginPractice(deps, { userId: 'owner', size: 15 });
    expect(result?.items).toHaveLength(15);
    expect(new Set(result?.items.map((i) => i.card?.id)).size).toBe(15);
  });
});
