import { describe, expect, it } from 'vitest';

import { calculateCurrentStreak, calculateLongestStreak, reviewWeek } from './streak';

const NOW = new Date('2026-09-19T03:00:00Z'); // 10:00 ngày 19/09 tại Việt Nam

describe('E5-S1-T1 — tính chuỗi ngày ôn tập', () => {
  it('không có ngày ôn tập thì streak bằng 0', () => {
    expect(calculateCurrentStreak([], NOW)).toBe(0);
  });

  it('TC-015: đếm 5 ngày thực sự ôn liên tiếp, bao gồm hôm nay', () => {
    expect(
      calculateCurrentStreak(
        ['2026-09-19', '2026-09-18', '2026-09-17', '2026-09-16', '2026-09-15'],
        NOW,
      ),
    ).toBe(5);
  });

  it('TC-016: ôn hôm nay sau khi bỏ lỡ 2 ngày thì streak được đặt lại thành 1', () => {
    expect(calculateCurrentStreak(['2026-09-19', '2026-09-16', '2026-09-15'], NOW)).toBe(1);
  });

  it('cho phép nghỉ 1 ngày nhưng không cộng ngày nghỉ vào streak', () => {
    expect(calculateCurrentStreak(['2026-09-19', '2026-09-17', '2026-09-16'], NOW)).toBe(3);
  });

  it('chưa ôn hôm nay nhưng đã ôn hôm qua thì vẫn giữ streak', () => {
    expect(calculateCurrentStreak(['2026-09-18', '2026-09-17'], NOW)).toBe(2);
  });

  it('không ôn hôm nay và hôm qua thì streak bằng 0', () => {
    expect(calculateCurrentStreak(['2026-09-17', '2026-09-16'], NOW)).toBe(0);
  });

  it('xác định ngày hiện tại theo Asia/Ho_Chi_Minh tại ranh giới UTC', () => {
    const afterVietnamMidnight = new Date('2026-09-18T17:30:00Z');

    expect(calculateCurrentStreak(['2026-09-19'], afterVietnamMidnight)).toBe(1);
  });

  it('không đếm trùng cùng một ngày và không phụ thuộc thứ tự đầu vào', () => {
    expect(
      calculateCurrentStreak(['2026-09-18', '2026-09-19', '2026-09-18', '2026-09-17'], NOW),
    ).toBe(3);
  });
});

describe('E10-S1-T1 — kỷ lục chuỗi ngày ôn tập', () => {
  it('không có ngày ôn tập thì kỷ lục bằng 0', () => {
    expect(calculateLongestStreak([], NOW)).toBe(0);
  });

  it('lấy chuỗi dài nhất trong lịch sử dù chuỗi hiện tại đã đứt', () => {
    const days = ['2026-09-10', '2026-09-09', '2026-09-08', '2026-09-05', '2026-09-04'];

    expect(calculateCurrentStreak(days, NOW)).toBe(0);
    expect(calculateLongestStreak(days, NOW)).toBe(3);
  });

  it('dùng cùng luật ân hạn: nghỉ 1 ngày vẫn nối chuỗi, nghỉ 2 ngày thì đứt', () => {
    expect(
      calculateLongestStreak(['2026-09-19', '2026-09-17', '2026-09-16', '2026-09-13'], NOW),
    ).toBe(3);
  });

  it('kỷ lục không nhỏ hơn chuỗi hiện tại', () => {
    const days = ['2026-09-19', '2026-09-18', '2026-09-17', '2026-09-12'];

    expect(calculateLongestStreak(days, NOW)).toBe(calculateCurrentStreak(days, NOW));
  });

  it('bỏ qua ngày sau hôm nay theo Asia/Ho_Chi_Minh', () => {
    expect(calculateLongestStreak(['2026-09-20', '2026-09-19'], NOW)).toBe(1);
  });
});

describe('E10-S1-T1 — dải ngày ôn trong tuần', () => {
  it('trả bảy ngày từ Thứ Hai tới Chủ Nhật của tuần chứa hôm nay', () => {
    // 19/09/2026 là Thứ Bảy.
    expect(reviewWeek(['2026-09-19', '2026-09-15', '2026-09-13'], NOW)).toEqual([
      { date: '2026-09-14', reviewed: false },
      { date: '2026-09-15', reviewed: true },
      { date: '2026-09-16', reviewed: false },
      { date: '2026-09-17', reviewed: false },
      { date: '2026-09-18', reviewed: false },
      { date: '2026-09-19', reviewed: true },
      { date: '2026-09-20', reviewed: false },
    ]);
  });

  it('Thứ Hai mở đầu tuần, Chủ Nhật khép lại tuần', () => {
    const monday = new Date('2026-09-21T01:00:00Z');
    const sunday = new Date('2026-09-20T16:59:59Z'); // 23:59:59 Chủ Nhật tại Việt Nam

    expect(reviewWeek([], monday)[0]!.date).toBe('2026-09-21');
    expect(reviewWeek([], sunday)[6]!.date).toBe('2026-09-20');
  });
});
