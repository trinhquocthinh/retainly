import { describe, expect, it } from 'vitest';

import {
  isUndoKey,
  outcomeForKey,
  outcomeForSwipe,
  progressPercent,
  SWIPE_COMMIT_DISTANCE,
} from './review';

describe('E1-S3-T7 — luật thuần của phiên ôn tập', () => {
  it('phím mũi tên ánh xạ đúng kết quả, phím khác thì không', () => {
    expect(outcomeForKey('ArrowLeft')).toBe('forgotten');
    expect(outcomeForKey('ArrowRight')).toBe('remembered');
    expect(outcomeForKey('Enter')).toBeUndefined();
  });

  it('E8-S1-T5: phím số theo thứ tự nút — 1 Quên, 2 Nhớ', () => {
    expect(outcomeForKey('1')).toBe('forgotten');
    expect(outcomeForKey('2')).toBe('remembered');
    expect(outcomeForKey('3')).toBeUndefined();
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

describe('E8-S1-T2 — phím hoàn tác', () => {
  const plain = { ctrlKey: false, metaKey: false, altKey: false };

  it('Z thường hay hoa đều là hoàn tác', () => {
    expect(isUndoKey({ ...plain, key: 'z' })).toBe(true);
    expect(isUndoKey({ ...plain, key: 'Z' })).toBe(true);
    expect(isUndoKey({ ...plain, key: 'x' })).toBe(false);
  });

  it('Ctrl/Cmd/Alt+Z để lại cho trình duyệt', () => {
    expect(isUndoKey({ ...plain, key: 'z', ctrlKey: true })).toBe(false);
    expect(isUndoKey({ ...plain, key: 'z', metaKey: true })).toBe(false);
    expect(isUndoKey({ ...plain, key: 'z', altKey: true })).toBe(false);
  });
});
