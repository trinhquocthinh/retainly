import { describe, expect, it } from 'vitest';

import { getCurrentStreak, type StreakQuery } from './get-current-streak';

const NOW = new Date('2026-09-19T03:00:00Z');
const USER = '00000000-0000-0000-0000-000000000001';

describe('E5-S1-T1 — lấy chuỗi ngày hiện tại', () => {
  it('tính streak từ các ngày review của đúng user', async () => {
    const calls: string[] = [];
    const streaks: StreakQuery = {
      async findReviewDaysBy(userId) {
        calls.push(userId);
        return ['2026-09-19', '2026-09-17'];
      },
    };

    const result = await getCurrentStreak({ streaks, now: () => NOW }, { userId: USER });

    expect(result).toEqual({ currentStreak: 2 });
    expect(calls).toEqual([USER]);
  });
});
