import { describe, expect, it } from 'vitest';

import { statsFixture, topicStats } from '@src/shared/test/stats';

import { buildStatsCsv, statsReportFileName } from './statsReport';

function lines(csv: string) {
  return csv.split('\r\n');
}

describe('E10-S1-T5 — TC-074 báo cáo CSV', () => {
  it('ghi đủ ba khối: tổng quan, nhánh kiến thức, lượt ôn T2–CN', () => {
    const csv = buildStatsCsv(
      statsFixture({
        topics: [
          topicStats({
            topic: { id: 'topic-arch', name: 'Kiến trúc phần mềm' },
            reviews: 48,
            forgotten: 20,
            forgetRate: 0.42,
            reviewShare: 0.48,
            averageDifficulty: 6.8421,
            dueCount: 0,
          }),
        ],
      }),
    );

    expect(csv).toBe(
      [
        'Báo cáo thống kê Retainly',
        'Chỉ số,Giá trị',
        'Khoảng thời gian,30 ngày gần nhất',
        'Từ ngày,2026-08-26',
        'Đến ngày,2026-09-24',
        'Số ngày có ôn,26',
        'Số ngày trong khoảng,30',
        'Tỷ lệ ngày có ôn (%),86.7',
        'Chuỗi hiện tại (ngày),7',
        'Kỷ lục chuỗi (ngày),19',
        'Thẻ nhớ vững trên 30 ngày,38',
        'Tổng số thẻ,91',
        'Tỷ lệ thẻ nhớ vững (%),41.8',
        'Lượt nhớ,942',
        'Tổng lượt ôn,1000',
        'Tỷ lệ nhớ lại (%),94.2',
        'Mức tham chiếu (%),90',
        '',
        'Kết quả theo chủ đề',
        'Chủ đề,Lượt ôn,Lượt quên,Tỷ lệ quên (%),Tỷ trọng lượt ôn (%),Độ khó trung bình,Thẻ cần ôn',
        'Kiến trúc phần mềm,48,20,42,48,6.84,0',
        '',
        'Lượt ôn tuần này (T2–CN)',
        'Ngày,Lượt ôn',
        '2026-09-21,24',
        '2026-09-22,32',
        '2026-09-23,18',
        '2026-09-24,46',
        '2026-09-25,0',
        '2026-09-26,0',
        '2026-09-27,0',
        '',
      ].join('\r\n'),
    );
  });

  it('tỷ lệ và độ khó chưa có thì để ô trống, không ghi 0 giả', () => {
    const csv = buildStatsCsv(
      statsFixture({
        consistency: { reviewDays: 0, totalDays: 30, rate: 0 },
        recall: { remembered: 0, total: 0, rate: null, target: 0.9 },
        durable: { cards: 0, totalCards: 0, share: null },
        topics: [topicStats({ averageDifficulty: null })],
      }),
    );

    expect(lines(csv)).toContain('Tỷ lệ nhớ lại (%),');
    expect(lines(csv)).toContain('Tỷ lệ thẻ nhớ vững (%),');
    expect(lines(csv)).toContain('Tỷ lệ ngày có ôn (%),0');
    expect(lines(csv)).toContain('Kiến trúc phần mềm,10,3,30,100,,0');
  });

  it('tên nhánh có dấu phẩy, ngoặc kép hay xuống dòng được bọc đúng RFC 4180', () => {
    const csv = buildStatsCsv(
      statsFixture({
        topics: [topicStats({ topic: { id: 't', name: 'Mạng, "TCP"\nvà UDP' } })],
      }),
    );

    expect(csv).toContain('"Mạng, ""TCP""\nvà UDP",10,3');
  });

  it.each([
    ['=HYPERLINK("x")', `"'=HYPERLINK(""x"")"`],
    ['+84 số', "'+84 số"],
    ['-Kiến trúc', "'-Kiến trúc"],
    ['@SUM(A1)', "'@SUM(A1)"],
  ])('tên nhánh %s không bị bảng tính chạy như công thức', (name, cell) => {
    const csv = buildStatsCsv(statsFixture({ topics: [topicStats({ topic: { id: 't', name } })] }));

    expect(lines(csv)).toContain(`${cell},10,3,30,100,6.8,0`);
  });

  it('toàn bộ thời gian ghi đúng khoảng và tên tệp theo ngày cuối khoảng', () => {
    const stats = statsFixture({ range: 'all', period: { from: '2025-12-30', to: '2026-09-24' } });

    expect(lines(buildStatsCsv(stats))).toContain('Khoảng thời gian,Toàn bộ thời gian');
    expect(statsReportFileName(stats)).toBe('retainly-thong-ke-toan-bo-2026-09-24.csv');
    expect(statsReportFileName(statsFixture())).toBe('retainly-thong-ke-30-ngay-2026-09-24.csv');
  });
});
