import { describe, expect, it } from 'vitest';
import { selectPracticeCards, type PracticeCandidate } from './practice-selection';
import { createInitialSchedule } from './review-scheduler';

const NOW = new Date('2026-10-24T03:00:00Z');
const DAY = 86_400_000;

function candidate(id: string, learned = false, dueDays = 0): PracticeCandidate {
  return {
    id,
    topicId: null,
    sourceId: null,
    createdAt: NOW,
    schedule: {
      ...createInitialSchedule(NOW),
      dueDate: new Date(NOW.getTime() + dueDays * DAY),
      state: learned ? 'review' : 'new',
      reps: learned ? 1 : 0,
      stability: learned ? 3 : 0,
      difficulty: learned ? 5 : 0,
      lastReviewedAt: learned ? new Date(NOW.getTime() - DAY) : null,
    },
  };
}

describe('chọn thẻ cho bài học nhỏ', () => {
  it('thêm 50 thẻ chưa học vẫn chỉ nhận 5 thẻ mới khi đủ thẻ cũ', () => {
    const old = Array.from({ length: 20 }, (_, i) => candidate(`old-${i}`, true));
    const fresh = Array.from({ length: 50 }, (_, i) => candidate(`new-${i}`));
    const selected = selectPracticeCards([...old, ...fresh], NOW, 15, () => 0.5);
    expect(selected).toHaveLength(15);
    expect(selected.filter((c) => c.schedule.lastReviewedAt === null)).toHaveLength(5);
    expect(new Set(selected.map((c) => c.id)).size).toBe(15);
  });

  it('bổ sung thẻ cũ chưa đến hạn khi không có thẻ cũ đến hạn', () => {
    const rows = [
      ...Array.from({ length: 15 }, (_, i) => candidate(`old-${i}`, true, 3)),
      ...Array.from({ length: 20 }, (_, i) => candidate(`new-${i}`)),
    ];
    const selected = selectPracticeCards(rows, NOW, 15, () => 0.5);
    expect(selected.filter((c) => c.schedule.lastReviewedAt !== null)).toHaveLength(10);
    expect(selected.filter((c) => c.schedule.lastReviewedAt === null)).toHaveLength(5);
  });

  it('ưu tiên thẻ quá hạn lâu hơn trước thẻ hôm nay và ôn sớm', () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, i) => candidate(`early-${i}`, true, 3)),
      ...Array.from({ length: 20 }, (_, i) => candidate(`due-${i}`, true)),
      ...Array.from({ length: 10 }, (_, i) => candidate(`overdue-${i}`, true, -5)),
      ...Array.from({ length: 5 }, (_, i) => candidate(`new-${i}`)),
    ];
    const selected = selectPracticeCards(rows, NOW, 15, () => 0.5);
    expect(selected.filter((c) => c.id.startsWith('overdue-'))).toHaveLength(10);
  });

  it.each([
    [50, false, 15, 15],
    [50, true, 15, 15],
    [7, false, 15, 7],
    [0, false, 15, 0],
    [50, false, 10, 10],
  ] as const)('%i thẻ, learned=%s, bài %i trả %i thẻ', (count, learned, size, want) => {
    const rows = Array.from({ length: count }, (_, i) => candidate(`${i}`, learned));
    expect(selectPracticeCards(rows, NOW, size, () => 0.5)).toHaveLength(want);
  });

  it('thẻ tạo từ tuần trước nhưng chưa từng ôn vẫn là thẻ chưa học', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      ...candidate(`new-${i}`),
      createdAt: new Date(NOW.getTime() - 7 * DAY),
    }));
    const selected = selectPracticeCards(rows, NOW, 15, () => 0.5);
    expect(selected).toHaveLength(15);
    expect(selected.every((c) => c.schedule.lastReviewedAt === null)).toBe(true);
  });

  it('phiên mới có thể đổi thứ tự; không sửa thứ tự mảng đầu vào', () => {
    const rows = Array.from({ length: 20 }, (_, i) => candidate(`${i}`));
    const ids = rows.map((c) => c.id);
    const first = selectPracticeCards(rows, NOW, 15, () => 0.1).map((c) => c.id);
    const second = selectPracticeCards(rows, NOW, 15, () => 0.9).map((c) => c.id);
    expect(first).not.toEqual(second);
    expect(rows.map((c) => c.id)).toEqual(ids);
  });

  it('giảm các thẻ cùng nguồn đứng cạnh nhau khi có đủ nguồn khác', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      ...candidate(`${i}`),
      sourceId: `source-${i % 3}`,
    }));
    const selected = selectPracticeCards(rows, NOW, 15, () => 0.5);
    expect(selected.slice(1).every((c, i) => c.sourceId !== selected[i].sourceId)).toBe(true);
  });
});
