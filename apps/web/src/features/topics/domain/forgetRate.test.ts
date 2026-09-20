import { describe, expect, it } from 'vitest';

import { buildAdvice, buildForgetRateReport, type TopicForgetRate } from './forgetRate';

function topic(overrides: Partial<TopicForgetRate> = {}): TopicForgetRate {
  return {
    topicId: 't1',
    topicName: 'Kiến trúc phần mềm',
    forgetRate: 0.3,
    totalReviews: 10,
    ...overrides,
  };
}

describe('E6-S1-T2 — Tổng hợp báo cáo tỷ lệ quên', () => {
  it('đổi tỷ lệ thập phân sang phần trăm một chữ số và tính tỷ trọng lượt ôn', () => {
    const report = buildForgetRateReport([
      topic({ topicId: 't1', forgetRate: 0.148, totalReviews: 48 }),
      topic({ topicId: 't2', topicName: 'Trí nhớ', forgetRate: 0.062, totalReviews: 52 }),
    ]);

    expect(report.totalReviews).toBe(100);
    expect(report.topicCount).toBe(2);
    expect(report.rows[0]).toMatchObject({ forgetPercent: 14.8, sharePercent: 48 });
    expect(report.rows[1]).toMatchObject({ forgetPercent: 6.2, sharePercent: 52 });
  });

  it('giữ nguyên thứ tự giảm dần do máy chủ trả về', () => {
    const report = buildForgetRateReport([
      topic({ topicId: 'cao', forgetRate: 0.42 }),
      topic({ topicId: 'thap', forgetRate: 0.05 }),
    ]);

    expect(report.rows.map((row) => row.topicId)).toEqual(['cao', 'thap']);
  });

  it('gán sắc thái theo ngưỡng 20% và 10%', () => {
    const report = buildForgetRateReport([
      topic({ topicId: 'do', forgetRate: 0.2 }),
      topic({ topicId: 'trungtinh', forgetRate: 0.148 }),
      topic({ topicId: 'xanh', forgetRate: 0.1 }),
    ]);

    expect(report.rows.map((row) => row.tone)).toEqual(['danger', 'neutral', 'success']);
  });

  it('không chia cho 0 khi chưa có topic nào', () => {
    expect(buildForgetRateReport([])).toEqual({ rows: [], totalReviews: 0, topicCount: 0 });
  });

  it('đề xuất bám nhánh đầu bảng và hạ giọng khi cả kho đã ổn', () => {
    const risky = buildForgetRateReport([topic({ forgetRate: 0.148 })]);
    const steady = buildForgetRateReport([topic({ forgetRate: 0.023 })]);

    expect(buildAdvice(risky.rows)).toEqual({
      topicName: 'Kiến trúc phần mềm',
      forgetPercent: 14.8,
      level: 'attention',
    });
    expect(buildAdvice(steady.rows)?.level).toBe('steady');
    expect(buildAdvice([])).toBeNull();
  });
});
