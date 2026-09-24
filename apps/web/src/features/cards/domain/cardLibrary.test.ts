import { describe, expect, it } from 'vitest';

import {
  describeDue,
  parseLibraryFilters,
  toSearchParams,
  type CardScheduleSummary,
  type LibraryFilters,
} from './cardLibrary';

const TOPIC_ID = '00000000-0000-4000-8000-0000000000a1';

// 09:00 ngày 23/09 giờ Việt Nam.
const NOW = new Date('2026-09-23T02:00:00.000Z');

function schedule(overrides: Partial<CardScheduleSummary>): CardScheduleSummary {
  return {
    state: 'review',
    dueDate: NOW.toISOString(),
    stability: 4,
    difficulty: 5,
    lastReviewedAt: '2026-09-19T02:00:00.000Z',
    ...overrides,
  };
}

describe('E9-S1-T2 — describeDue', () => {
  it('thẻ chưa ôn lần nào là "Thẻ mới" dù hạn đã tới', () => {
    expect(describeDue(schedule({ state: 'new', lastReviewedAt: null }), NOW)).toEqual({
      tone: 'new',
      label: 'Thẻ mới',
    });
  });

  it.each([
    // 23:30 cùng ngày giờ Việt Nam vẫn là hôm nay.
    ['2026-09-23T16:30:00.000Z', 'due', 'Đến hạn hôm nay'],
    // 23:00 hôm qua giờ Việt Nam: chưa đủ 24 giờ nhưng đã qua một ngày lịch.
    ['2026-09-22T16:00:00.000Z', 'due', 'Quá hạn 1 ngày'],
    ['2026-09-20T02:00:00.000Z', 'due', 'Quá hạn 3 ngày'],
    // 00:30 ngày mai giờ Việt Nam.
    ['2026-09-23T17:30:00.000Z', 'upcoming', 'Còn 1 ngày'],
    ['2026-10-03T02:00:00.000Z', 'upcoming', 'Còn 10 ngày'],
  ])('hạn %s → %s "%s"', (dueDate, tone, label) => {
    expect(describeDue(schedule({ dueDate }), NOW)).toEqual({ tone, label });
  });
});

describe('E9-S1-T2 — bộ lọc Thư viện trên URL', () => {
  it('URL trống là bộ lọc mặc định', () => {
    expect(parseLibraryFilters(new URLSearchParams())).toEqual({
      q: '',
      sort: 'recent',
      topic: '',
      page: 1,
    });
  });

  it('đọc đủ bốn tham số hợp lệ', () => {
    const params = new URLSearchParams({ q: 'đà nẵng', sort: 'due', topic: TOPIC_ID, page: '3' });

    expect(parseLibraryFilters(params)).toEqual({
      q: 'đà nẵng',
      sort: 'due',
      topic: TOPIC_ID,
      page: 3,
    });
    expect(parseLibraryFilters(new URLSearchParams({ topic: 'none' })).topic).toBe('none');
  });

  it('giá trị hỏng quay về mặc định, từ khoá dài bị cắt ở 100 ký tự', () => {
    const params = new URLSearchParams({
      q: 'a'.repeat(150),
      sort: 'random',
      topic: 'khong-phai-uuid',
      page: '-2',
    });

    expect(parseLibraryFilters(params)).toEqual({
      q: 'a'.repeat(100),
      sort: 'recent',
      topic: '',
      page: 1,
    });
    expect(parseLibraryFilters(new URLSearchParams({ page: '1.5' })).page).toBe(1);
  });

  it('ghi ra URL bỏ qua giá trị mặc định và đọc lại ra đúng bộ lọc', () => {
    const filters: LibraryFilters = { q: 'fsrs', sort: 'stability', topic: 'none', page: 2 };

    expect(toSearchParams({ q: '', sort: 'recent', topic: '', page: 1 }).toString()).toBe('');
    expect(parseLibraryFilters(toSearchParams(filters))).toEqual(filters);
  });
});
