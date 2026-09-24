import { describe, expect, it } from 'vitest';

import { describePeriod, rangeStart, ratio, weekActivity, weekStart } from './stats';

// 12:00 Thứ Năm 24/09 tại Việt Nam.
const NOW = new Date('2026-09-24T05:00:00Z');

describe('E10-S1-T3 — khoảng thống kê theo giờ Việt Nam', () => {
  it('30 ngày tính cả hôm nay: mốc lọc là 00:00 giờ VN của ngày 26/08', () => {
    expect(rangeStart('30d', NOW)).toEqual(new Date('2026-08-25T17:00:00.000Z'));
    expect(rangeStart('all', NOW)).toBeNull();
  });

  it('30 ngày: đếm ngày có ôn trong khoảng, bỏ ngày cũ hơn và ngày tương lai', () => {
    const reviewDays = ['2026-09-25', '2026-09-24', '2026-09-24', '2026-08-26', '2026-08-25'];

    expect(describePeriod('30d', reviewDays, NOW)).toEqual({
      period: { from: '2026-08-26', to: '2026-09-24' },
      consistency: { reviewDays: 2, totalDays: 30, rate: 2 / 30 },
    });
  });

  it('30 ngày chưa ôn lần nào vẫn đủ 30 ngày, tỷ lệ 0', () => {
    expect(describePeriod('30d', [], NOW).consistency).toEqual({
      reviewDays: 0,
      totalDays: 30,
      rate: 0,
    });
  });

  it('toàn bộ: tính từ ngày ôn đầu tiên tới hôm nay', () => {
    expect(describePeriod('all', ['2026-09-24', '2026-09-20', '2026-09-15'], NOW)).toEqual({
      period: { from: '2026-09-15', to: '2026-09-24' },
      consistency: { reviewDays: 3, totalDays: 10, rate: 0.3 },
    });
  });

  it('toàn bộ khi chưa ôn lần nào: khoảng rỗng, tỷ lệ null thay vì 0% giả', () => {
    expect(describePeriod('all', [], NOW)).toEqual({
      period: { from: null, to: '2026-09-24' },
      consistency: { reviewDays: 0, totalDays: 0, rate: null },
    });
  });
});

describe('E10-S1-T3 — hoạt động trong tuần', () => {
  it('tuần bắt đầu 00:00 Thứ Hai giờ VN', () => {
    expect(weekStart(NOW)).toEqual(new Date('2026-09-20T17:00:00.000Z'));
  });

  it('đủ 7 ngày T2–CN, ngày không có lượt ôn là 0', () => {
    const week = weekActivity(
      [
        { date: '2026-09-21', reviews: 12 },
        { date: '2026-09-24', reviews: 46 },
      ],
      NOW,
    );

    expect(week).toEqual([
      { date: '2026-09-21', reviews: 12 },
      { date: '2026-09-22', reviews: 0 },
      { date: '2026-09-23', reviews: 0 },
      { date: '2026-09-24', reviews: 46 },
      { date: '2026-09-25', reviews: 0 },
      { date: '2026-09-26', reviews: 0 },
      { date: '2026-09-27', reviews: 0 },
    ]);
  });

  it('tỷ lệ có mẫu số 0 trả null', () => {
    expect(ratio(3, 4)).toBe(0.75);
    expect(ratio(0, 0)).toBeNull();
  });
});
