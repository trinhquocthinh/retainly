import { describe, expect, it } from 'vitest';

import { calendarDaysBetween, formatLastReview } from './date';

describe('calendarDaysBetween — ngày lịch giờ Việt Nam', () => {
  it('qua nửa đêm giờ VN là sang ngày mới dù chưa đủ 24 giờ', () => {
    // 23:30 ngày 22/9 giờ VN → 07:00 ngày 23/9 giờ VN.
    const lateNight = new Date('2026-09-22T16:30:00Z');
    expect(calendarDaysBetween(lateNight, new Date('2026-09-23T00:00:00Z'))).toBe(1);
    expect(calendarDaysBetween(lateNight, new Date('2026-09-22T16:45:00Z'))).toBe(0);
  });

  it('âm khi mốc sau nằm trước mốc đầu', () => {
    expect(
      calendarDaysBetween(new Date('2026-09-25T03:00:00Z'), new Date('2026-09-23T03:00:00Z')),
    ).toBe(-2);
  });

  it('ôn gần nhất: hôm nay, hôm qua, N ngày trước', () => {
    const lateNight = '2026-09-22T16:30:00.000Z';
    expect(formatLastReview(lateNight, new Date('2026-09-23T00:00:00Z'))).toBe('hôm qua');
    expect(formatLastReview(lateNight, new Date('2026-09-22T16:45:00Z'))).toBe('hôm nay');
    expect(formatLastReview('2026-09-10T02:00:00.000Z', new Date('2026-09-23T05:00:00Z'))).toBe(
      '13 ngày trước',
    );
  });
});
