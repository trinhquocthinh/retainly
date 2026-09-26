import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SECONDS_PER_CARD,
  estimateRemainingMinutes,
  formatDuration,
  MAX_SECONDS_PER_CARD,
  tallySession,
} from './session';

describe('E8-S1-T5 — ước tính thời gian còn lại', () => {
  it(`chưa chấm thẻ nào thì tính ${DEFAULT_SECONDS_PER_CARD} giây mỗi thẻ`, () => {
    expect(estimateRemainingMinutes({ remaining: 15, reviewed: 0, elapsedMs: 0 })).toBe(2);
  });

  it('đã chấm thì theo nhịp thực của phiên', () => {
    // 3 thẻ trong 90 giây → 30 giây/thẻ; 10 thẻ còn lại → 5 phút.
    expect(estimateRemainingMinutes({ remaining: 10, reviewed: 3, elapsedMs: 90_000 })).toBe(5);
  });

  it(`nhịp bị chặn trần ${MAX_SECONDS_PER_CARD} giây/thẻ khi bỏ dở lâu`, () => {
    expect(estimateRemainingMinutes({ remaining: 4, reviewed: 1, elapsedMs: 3_600_000 })).toBe(4);
  });

  it('còn thẻ thì tối thiểu 1 phút, hết thẻ thì 0', () => {
    expect(estimateRemainingMinutes({ remaining: 1, reviewed: 5, elapsedMs: 5_000 })).toBe(1);
    expect(estimateRemainingMinutes({ remaining: 0, reviewed: 5, elapsedMs: 5_000 })).toBe(0);
  });
});

describe('E8-S1-T5 — tổng kết phiên', () => {
  it('đếm Nhớ/Quên, thẻ bị bỏ qua không tính là đã ôn', () => {
    expect(tallySession(['remembered', null, 'forgotten', 'remembered'])).toEqual({
      reviewed: 3,
      remembered: 2,
      forgotten: 1,
    });
    expect(tallySession([])).toEqual({ reviewed: 0, remembered: 0, forgotten: 0 });
  });

  it('thời lượng ghi phút và giây, bỏ phần bằng 0', () => {
    expect(formatDuration(45_000)).toBe('45 giây');
    expect(formatDuration(120_000)).toBe('2 phút');
    expect(formatDuration(125_400)).toBe('2 phút 5 giây');
  });
});
