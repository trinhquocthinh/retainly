import { describe, it, expect } from 'vitest';

import { createCard, type CardRepository } from './create-card';

const NOW = new Date('2026-06-15T09:00:00Z');
const USER = '00000000-0000-0000-0000-000000000001';

type SavedCard = Parameters<CardRepository['create']>[0];

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
      { cards, now: () => NOW },
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
      createCard({ cards, now: () => NOW }, { userId: USER, front: ' ', back: 'Paris' }),
    ).rejects.toThrow('ERR_EMPTY_FRONT');

    expect(cards.saved).toHaveLength(0);
  });
});
