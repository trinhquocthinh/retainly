import { describe, expect, it } from 'vitest';

import { formatForecast, formatMemory, isNewCard, type CardMemory } from './memory';

const MEMORY: CardMemory = {
  stability: 13.83,
  difficulty: 2.11,
  retrievability: 0.8991,
  lastReviewedAt: '2026-09-10T02:00:00.000Z',
  forecastDays: { remembered: 57, forgotten: 2 },
};

describe('E8-S1-T5 — hiển thị chỉ số trí nhớ', () => {
  it('S một chữ số thập phân kèm đơn vị ngày, D một chữ số, R phần trăm làm tròn', () => {
    expect(formatMemory(MEMORY)).toEqual({
      stability: '13,8 ngày',
      difficulty: '2,1',
      retrievability: '90%',
    });
  });

  it('thẻ chưa có lần ôn nào là thẻ mới', () => {
    expect(isNewCard(MEMORY)).toBe(false);
    expect(isNewCard({ ...MEMORY, lastReviewedAt: null })).toBe(true);
  });

  it('dự báo khoảng cách ghi dạng +N ngày', () => {
    expect(formatForecast(1)).toBe('+1 ngày');
    expect(formatForecast(57)).toBe('+57 ngày');
  });
});
