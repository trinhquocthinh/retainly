import { describe, expect, it } from 'vitest';

import { countDue, describeUpcoming, describeWeek, greetingFor, summarizeDueTopics } from './home';

const topic = (name: string) => ({ id: `id-${name}`, name });

describe('E10-S1-T2 — số liệu Trang chủ', () => {
  it('đếm thẻ đến hạn trên mọi nhóm Topic, kể cả nhóm chưa gán', () => {
    expect(countDue([])).toBe(0);
    expect(
      countDue([
        { topic: topic('FSRS'), count: 4 },
        { topic: null, count: 2 },
      ]),
    ).toBe(6);
  });

  it.each([
    ['2026-09-23T21:30:00.000Z', 'Chào buổi sáng'], // 04:30 giờ VN
    ['2026-09-24T04:00:00.000Z', 'Chào buổi trưa'], // 11:00
    ['2026-09-24T08:00:00.000Z', 'Chào buổi chiều'], // 15:00
    ['2026-09-24T12:00:00.000Z', 'Chào buổi tối'], // 19:00
    ['2026-09-23T20:00:00.000Z', 'Chào buổi tối'], // 03:00
  ])('lúc %s chào "%s" theo giờ Việt Nam', (iso, greeting) => {
    expect(greetingFor(new Date(iso))).toBe(greeting);
  });

  it('nêu tên tối đa 3 Topic, phần còn lại gộp thành thẻ khác', () => {
    expect(
      summarizeDueTopics([
        { topic: topic('A'), count: 5 },
        { topic: topic('B'), count: 3 },
        { topic: topic('C'), count: 2 },
        { topic: topic('D'), count: 1 },
        { topic: null, count: 4 },
      ]),
    ).toEqual({
      groups: [
        { name: 'A', count: 5 },
        { name: 'B', count: 3 },
        { name: 'C', count: 2 },
      ],
      otherCount: 5,
    });
  });

  it('không thẻ nào gắn Topic thì không tóm tắt', () => {
    expect(summarizeDueTopics([{ topic: null, count: 4 }])).toBeNull();
    expect(summarizeDueTopics([])).toBeNull();
  });

  it('dải tuần phân biệt đã ôn, bỏ lỡ, hôm nay và ngày chưa tới', () => {
    const week = [
      { date: '2026-09-21', reviewed: true },
      { date: '2026-09-22', reviewed: false },
      { date: '2026-09-23', reviewed: true },
      { date: '2026-09-24', reviewed: false },
      { date: '2026-09-25', reviewed: false },
      { date: '2026-09-26', reviewed: false },
      { date: '2026-09-27', reviewed: false },
    ];
    // 23:30 ngày 24/09 giờ VN — UTC vẫn là 24/09 nhưng phải so theo ngày VN.
    const days = describeWeek(week, new Date('2026-09-24T16:30:00.000Z'));

    expect(days.map((day) => [day.label, day.state])).toEqual([
      ['T2', 'reviewed'],
      ['T3', 'missed'],
      ['T4', 'reviewed'],
      ['T5', 'today'],
      ['T6', 'future'],
      ['T7', 'future'],
      ['CN', 'future'],
    ]);
    expect(days.filter((day) => day.isToday).map((day) => day.date)).toEqual(['2026-09-24']);
  });

  it('hôm nay đã ôn thì vẫn là ngày đã ôn', () => {
    const [day] = describeWeek(
      [{ date: '2026-09-24', reviewed: true }],
      new Date('2026-09-24T03:00:00.000Z'),
    );

    expect(day).toMatchObject({ state: 'reviewed', isToday: true });
  });

  it('thẻ sắp tới đếm ngày theo lịch Việt Nam và ghi thứ, ngày/tháng', () => {
    // 23:00 ngày 24/09 VN; hạn 01:00 ngày 27/09 VN.
    expect(
      describeUpcoming('2026-09-26T18:00:00.000Z', new Date('2026-09-24T16:00:00.000Z')),
    ).toEqual({ daysAhead: 3, dateLabel: 'Chủ Nhật, 27/09' });
  });
});
