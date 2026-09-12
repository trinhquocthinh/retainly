import { describe, it, expect } from 'vitest';

import { endOfToday } from './due-window';

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
