import { describe, expect, it } from 'vitest';

import { calculateCurrentStreak } from './streak';

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
