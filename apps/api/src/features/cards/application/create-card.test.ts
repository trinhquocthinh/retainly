import { describe, it, expect } from 'vitest';

import { createCard, SourceOwnership, type CardRepository } from './create-card';

const NOW = new Date('2026-06-15T09:00:00Z');
const USER = '00000000-0000-0000-0000-000000000001';
const SOURCE = '00000000-0000-0000-0000-0000000000b1';

type SavedCard = Parameters<CardRepository['create']>[0];

const ownsEverything: SourceOwnership = { belongsToUser: async () => true };
const ownsNothing: SourceOwnership = { belongsToUser: async () => false };

function fakeRepository(): CardRepository & { saved: SavedCard[] } {
  const saved: SavedCard[] = [];
  return {
    saved,
    async create(card) {
      saved.push(card);
      return { id: 'card-1', createdAt: NOW, ...card };
    },
  };
}

describe('E1-S2-T3 — use case tạo thẻ', () => {
  it('TC-004: thẻ mới kèm lịch ôn state "new", đến hạn hôm nay (BR-003)', async () => {
    const cards = fakeRepository();

    const created = await createCard(
      { cards, sources: ownsEverything, now: () => NOW },
      { userId: USER, front: 'Thủ đô Pháp?', back: 'Paris' },
    );

    expect(created.schedule.state).toBe('new');
    expect(created.schedule.dueDate).toEqual(NOW);
    expect(created.schedule.intervalDays).toBe(0);
    expect(created.userId).toBe(USER);
  });

  it('không ghi gì xuống repository khi nội dung không hợp lệ', async () => {
    const cards = fakeRepository();

    await expect(
      createCard(
        { cards, sources: ownsEverything, now: () => NOW },
        { userId: USER, front: ' ', back: 'Paris' },
      ),
    ).rejects.toThrow('ERR_EMPTY_FRONT');

    expect(cards.saved).toHaveLength(0);
  });
});

describe('E2-S1-T4 — thẻ liên kết nguồn', () => {
  it('TC-037: sourceId hợp lệ được lưu kèm thẻ', async () => {
    const cards = fakeRepository();

    const created = await createCard(
      { cards, sources: ownsEverything, now: () => NOW },
      { userId: USER, sourceId: SOURCE, front: 'Hỏi', back: 'Đáp' },
    );

    expect(created.sourceId).toBe(SOURCE);
    expect(cards.saved[0].sourceId).toBe(SOURCE);
  });

  it('không có sourceId thì thẻ vẫn tạo được, trường để trống', async () => {
    const cards = fakeRepository();

    const created = await createCard(
      { cards, sources: ownsNothing, now: () => NOW },
      { userId: USER, front: 'Hỏi', back: 'Đáp' },
    );

    expect(created.sourceId).toBeUndefined();
  });

  // TC-038 (BR-002)
  it('sourceId của user khác trả ERR_SOURCE_NOT_FOUND và không lưu thẻ', async () => {
    const cards = fakeRepository();

    await expect(
      createCard(
        { cards, sources: ownsNothing, now: () => NOW },
        { userId: USER, sourceId: SOURCE, front: 'Hỏi', back: 'Đáp' },
      ),
    ).rejects.toThrow('ERR_SOURCE_NOT_FOUND');

    expect(cards.saved).toHaveLength(0);
  });
});
