import { describe, it, expect } from 'vitest';

import { endOfToday, startOfToday } from './due-window';

describe('E1-S2-T4 — mốc "đến hạn hôm nay"', () => {
  it('trả cuối ngày theo giờ Việt Nam, quy về UTC', () => {
    // 13:49 UTC = 20:49 cùng ngày ở +07
    expect(endOfToday(new Date('2026-09-12T13:49:00Z'))).toEqual(
      new Date('2026-09-12T16:59:59.999Z'),
    );
  });

  it('sau 17:00 UTC đã là ngày hôm sau ở Việt Nam', () => {
    // 18:00 UTC ngày 12 = 01:00 ngày 13 ở +07
    expect(endOfToday(new Date('2026-09-12T18:00:00Z'))).toEqual(
      new Date('2026-09-13T16:59:59.999Z'),
    );
  });

  it('đầu ngày và cuối ngày Việt Nam cho cùng một mốc', () => {
    expect(endOfToday(new Date('2026-09-11T17:00:00Z'))).toEqual(
      endOfToday(new Date('2026-09-12T16:59:00Z')),
    );
  });
});

describe('E8-S1-T3 — mốc "đầu ngày hôm nay"', () => {
  it('trả 00:00 giờ Việt Nam, quy về UTC', () => {
    // 13:49 UTC ngày 12 = 20:49 ngày 12 ở +07 → đầu ngày là 17:00 UTC ngày 11
    expect(startOfToday(new Date('2026-09-12T13:49:00Z'))).toEqual(
      new Date('2026-09-11T17:00:00.000Z'),
    );
  });

  it('liền sau cuối ngày hôm qua, không hở và không chồng lên', () => {
    const now = new Date('2026-09-12T13:49:00Z');
    const yesterday = new Date(now.getTime() - 86_400_000);

    expect(startOfToday(now).getTime()).toBe(endOfToday(yesterday).getTime() + 1);
  });
});
