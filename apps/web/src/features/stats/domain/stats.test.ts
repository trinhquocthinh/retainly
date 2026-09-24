import { describe, expect, it } from 'vitest';

import { statsFixture, topicStats } from '@src/shared/test/stats';

import {
  describeRecallGap,
  describeWeekActivity,
  forgetTone,
  formatPeriod,
  formatRate,
  parseRange,
  pickAdvice,
} from './stats';

describe('E10-S1-T4 — số liệu màn Thống kê', () => {
  it('chỉ nhận "all" từ URL, mọi giá trị khác về 30 ngày', () => {
    expect(parseRange('all')).toBe('all');
    expect(parseRange('30d')).toBe('30d');
    expect(parseRange('7d')).toBe('30d');
    expect(parseRange(null)).toBe('30d');
  });

  it('định dạng tỷ lệ một chữ số thập phân kiểu Việt Nam', () => {
    expect(formatRate(0.148)).toBe('14,8%');
    expect(formatRate(0.2)).toBe('20%');
    expect(formatRate(26 / 30)).toBe('86,7%');
  });

  it('ghi khoảng ngày, khác năm thì kèm năm, chưa ôn thì không có khoảng', () => {
    expect(formatPeriod({ from: '2026-08-26', to: '2026-09-24' })).toBe('26/08 – 24/09');
    expect(formatPeriod({ from: '2025-12-30', to: '2026-01-02' })).toBe('30/12/2025 – 02/01/2026');
    expect(formatPeriod({ from: null, to: '2026-09-24' })).toBeNull();
  });

  it('so tỷ lệ nhớ lại với mục tiêu theo điểm phần trăm', () => {
    expect(describeRecallGap(0.942, 0.9)).toEqual({ direction: 'above', points: '4,2' });
    expect(describeRecallGap(0.87, 0.9)).toEqual({ direction: 'below', points: '3' });
    expect(describeRecallGap(0.9, 0.9)).toEqual({ direction: 'equal', points: '0' });
  });

  it('gán sắc thái theo ngưỡng 20% và 10%', () => {
    expect([0.2, 0.148, 0.1].map(forgetTone)).toEqual(['danger', 'neutral', 'success']);
  });
});

describe('E10-S1-T4 — đề xuất ôn theo nhánh', () => {
  it('chọn nhánh quên nhiều nhất trong các nhánh còn thẻ đến hạn', () => {
    const advice = pickAdvice([
      topicStats({ topic: { id: 'a', name: 'A' }, forgetRate: 0.4, dueCount: 0 }),
      topicStats({ topic: { id: 'b', name: 'B' }, forgetRate: 0.148, dueCount: 15 }),
      topicStats({ topic: { id: 'c', name: 'C' }, forgetRate: 0.05, dueCount: 3 }),
    ]);

    expect(advice).toEqual({
      level: 'attention',
      topic: { id: 'b', name: 'B' },
      forgetRate: 0.148,
      dueCount: 15,
      minutes: 2, // 15 thẻ × 8 giây
    });
  });

  it('nhánh được chọn đã dưới ngưỡng an toàn thì hạ giọng', () => {
    expect(pickAdvice([topicStats({ forgetRate: 0.05, dueCount: 2 })])?.level).toBe('steady');
  });

  it('không nhánh nào còn thẻ đến hạn thì báo đã xong, không có Topic thì không đề xuất', () => {
    expect(pickAdvice([topicStats({ dueCount: 0 })])).toEqual({ level: 'clear' });
    expect(pickAdvice([])).toBeNull();
  });
});

describe('E10-S1-T4 — cột lượt ôn T2–CN', () => {
  // 12:00 Thứ Năm 24/09 giờ Việt Nam
  const NOW = new Date('2026-09-24T05:00:00.000Z');

  it('cột cao theo ngày nhiều lượt nhất, đánh dấu hôm nay, tương lai và ngày đỉnh', () => {
    const activity = describeWeekActivity(statsFixture().week, NOW);

    expect(activity.days.map((day) => day.height)).toEqual([52, 70, 39, 100, 0, 0, 0]);
    expect(activity.days.map((day) => day.label)).toEqual([
      'T2',
      'T3',
      'T4',
      'T5',
      'T6',
      'T7',
      'CN',
    ]);
    expect(activity.days[3]).toMatchObject({ isToday: true, isFuture: false, isPeak: true });
    expect(activity.days[4]).toMatchObject({ isToday: false, isFuture: true, isPeak: false });
    expect(activity.days[0]).toMatchObject({ isToday: false, isFuture: false });
    expect(activity.total).toBe(120);
    expect(activity.peak).toEqual({ name: 'Thứ 5', reviews: 46 });
  });

  it('hai ngày bằng nhau thì lấy ngày đầu làm đỉnh', () => {
    const week = statsFixture().week.map((day, index) => ({
      ...day,
      reviews: index === 1 || index === 2 ? 5 : 0,
    }));

    expect(describeWeekActivity(week, NOW).peak).toEqual({ name: 'Thứ 3', reviews: 5 });
  });

  it('cả tuần chưa ôn thì không có đỉnh và không chia cho 0', () => {
    const week = statsFixture().week.map((day) => ({ ...day, reviews: 0 }));
    const activity = describeWeekActivity(week, NOW);

    expect(activity.peak).toBeNull();
    expect(activity.total).toBe(0);
    expect(activity.days.every((day) => day.height === 0 && !day.isPeak)).toBe(true);
  });
});
