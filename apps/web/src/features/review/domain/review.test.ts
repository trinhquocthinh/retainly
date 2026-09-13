import { describe, expect, it } from 'vitest';

import { outcomeForKey, outcomeForSwipe, progressPercent, SWIPE_COMMIT_DISTANCE } from './review';

describe('E1-S3-T7 — luật thuần của phiên ôn tập', () => {
  it('phím mũi tên ánh xạ đúng kết quả, phím khác thì không', () => {
    expect(outcomeForKey('ArrowLeft')).toBe('forgotten');
    expect(outcomeForKey('ArrowRight')).toBe('remembered');
    expect(outcomeForKey('Enter')).toBeUndefined();
  });

  it('vuốt qua ngưỡng mới tính là đánh giá', () => {
    expect(outcomeForSwipe(SWIPE_COMMIT_DISTANCE)).toBe('remembered');
    expect(outcomeForSwipe(-SWIPE_COMMIT_DISTANCE)).toBe('forgotten');
  });

  it('vuốt chưa tới ngưỡng thì không đánh giá gì, kể cả sát mép', () => {
    expect(outcomeForSwipe(SWIPE_COMMIT_DISTANCE - 1)).toBeUndefined();
    expect(outcomeForSwipe(-SWIPE_COMMIT_DISTANCE + 1)).toBeUndefined();
    expect(outcomeForSwipe(0)).toBeUndefined();
  });

  it('hướng vuốt khớp với hướng phím mũi tên', () => {
    expect(outcomeForSwipe(999)).toBe(outcomeForKey('ArrowRight'));
    expect(outcomeForSwipe(-999)).toBe(outcomeForKey('ArrowLeft'));
  });

  it('tiến trình chia đúng, danh sách rỗng không chia cho 0', () => {
    expect(progressPercent(0, 4)).toBe(0);
    expect(progressPercent(1, 4)).toBe(25);
    expect(progressPercent(4, 4)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
  });
});
