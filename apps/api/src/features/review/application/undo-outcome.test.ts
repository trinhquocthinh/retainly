import { describe, it, expect } from 'vitest';

import { inMemoryReviews } from '../../../shared/test/in-memory-review';
import { createInitialSchedule } from '../domain/review-scheduler';
import { recordOutcome } from './record-outcome';
import { undoOutcome } from './undo-outcome';

const REVIEWED_AT = new Date('2026-09-23T09:00:00Z');
const MINUTE = 60_000;
const USER = '00000000-0000-0000-0000-000000000001';
const OTHER_USER = '00000000-0000-0000-0000-000000000002';
const CARD = '11111111-1111-1111-1111-111111111111';

const initial = createInitialSchedule(new Date('2026-09-20T00:00:00Z'));

/** Thẻ của USER đã được ôn một lượt lúc REVIEWED_AT. */
async function reviewedOnce() {
  const reviews = inMemoryReviews([{ ownerId: USER, cardId: CARD, schedule: initial }]);
  const { outcomeId } = await recordOutcome(
    { reviews, now: () => REVIEWED_AT },
    { userId: USER, cardId: CARD, outcome: 'remembered' },
  );
  return { reviews, outcomeId };
}

function undoAt(
  reviews: ReturnType<typeof inMemoryReviews>,
  outcomeId: string,
  minutesLater: number,
  userId = USER,
) {
  const now = new Date(REVIEWED_AT.getTime() + minutesLater * MINUTE);
  return undoOutcome({ reviews, now: () => now }, { userId, outcomeId });
}

describe('E8-S1-T1 — hoàn tác lượt ôn (BR-024)', () => {
  it('khôi phục nguyên trạng lịch trước lượt ôn và xoá hẳn outcome', async () => {
    const { reviews, outcomeId } = await reviewedOnce();

    const result = await undoAt(reviews, outcomeId, 1);

    expect(result.restoredSchedule).toEqual(initial);
    expect(reviews.schedules.get(CARD)?.schedule).toEqual(initial);
    expect(reviews.outcomes).toHaveLength(0);
  });

  it('đúng mốc 10 phút vẫn hoàn tác được', async () => {
    const { reviews, outcomeId } = await reviewedOnce();

    await expect(undoAt(reviews, outcomeId, 10)).resolves.toEqual({ restoredSchedule: initial });
  });

  it('quá 10 phút thì trả ERR_UNDO_NOT_ALLOWED, không đổi gì', async () => {
    const { reviews, outcomeId } = await reviewedOnce();
    const after = reviews.schedules.get(CARD)?.schedule;

    // 10 phút + 1 ms.
    await expect(undoAt(reviews, outcomeId, 10 + 1 / MINUTE)).rejects.toThrow(
      'ERR_UNDO_NOT_ALLOWED',
    );

    expect(reviews.schedules.get(CARD)?.schedule).toBe(after);
    expect(reviews.outcomes).toHaveLength(1);
  });

  it('outcome không phải mới nhất của thẻ thì trả ERR_UNDO_NOT_ALLOWED', async () => {
    const { reviews, outcomeId } = await reviewedOnce();
    await recordOutcome(
      { reviews, now: () => new Date(REVIEWED_AT.getTime() + MINUTE) },
      { userId: USER, cardId: CARD, outcome: 'forgotten' },
    );

    await expect(undoAt(reviews, outcomeId, 2)).rejects.toThrow('ERR_UNDO_NOT_ALLOWED');
    expect(reviews.outcomes).toHaveLength(2);
  });

  it('outcome ghi trước E8 không có ảnh chụp lịch thì trả ERR_UNDO_NOT_ALLOWED', async () => {
    const { reviews, outcomeId } = await reviewedOnce();
    reviews.outcomes[0]!.previousSchedule = null;

    await expect(undoAt(reviews, outcomeId, 1)).rejects.toThrow('ERR_UNDO_NOT_ALLOWED');
  });

  it('outcome không tồn tại thì trả ERR_OUTCOME_NOT_FOUND', async () => {
    const { reviews } = await reviewedOnce();

    await expect(undoAt(reviews, 'khong-co-outcome-nay', 1)).rejects.toThrow(
      'ERR_OUTCOME_NOT_FOUND',
    );
  });

  it('outcome của người khác cũng trả ERR_OUTCOME_NOT_FOUND, không đổi gì (BR-008)', async () => {
    const { reviews, outcomeId } = await reviewedOnce();

    await expect(undoAt(reviews, outcomeId, 1, OTHER_USER)).rejects.toThrow(
      'ERR_OUTCOME_NOT_FOUND',
    );
    expect(reviews.outcomes).toHaveLength(1);
  });

  it('hoàn tác xong thì chính outcome đó không còn để hoàn tác lần hai', async () => {
    const { reviews, outcomeId } = await reviewedOnce();
    await undoAt(reviews, outcomeId, 1);

    await expect(undoAt(reviews, outcomeId, 2)).rejects.toThrow('ERR_OUTCOME_NOT_FOUND');
  });
});
