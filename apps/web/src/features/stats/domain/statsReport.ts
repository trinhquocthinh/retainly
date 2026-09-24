import type { Stats, StatsRange } from './stats';

type Cell = string | number | null;

const RANGE_LABELS: Record<StatsRange, string> = {
  '30d': '30 ngày gần nhất',
  all: 'Toàn bộ thời gian',
};

const RANGE_SLUGS: Record<StatsRange, string> = { '30d': '30-ngay', all: 'toan-bo' };

// Excel/Sheets chạy ô bắt đầu bằng các ký tự này như công thức (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

/** Một ô theo RFC 4180; `null` thành ô trống chứ không phải 0 giả. */
function csvCell(value: Cell): string {
  if (value === null) return '';

  let text = String(value);
  // Chỉ chữ do người dùng nhập mới cần chặn; số âm vẫn là số.
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Tỷ lệ 0–1 thành phần trăm một chữ số thập phân, dấu chấm để bảng tính đọc được số. */
function percent(ratio: number | null): number | null {
  return ratio === null ? null : Math.round(ratio * 1000) / 10;
}

function round2(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

/** `retainly-thong-ke-30-ngay-2026-09-24.csv` — ngày lấy theo giờ Việt Nam từ máy chủ. */
export function statsReportFileName(stats: Stats): string {
  return `retainly-thong-ke-${RANGE_SLUGS[stats.range]}-${stats.period.to}.csv`;
}

/**
 * Báo cáo CSV từ chính số liệu SPEC-018 đang hiển thị: khối tổng quan, bảng nhánh
 * kiến thức và lượt ôn T2–CN, cách nhau một dòng trống.
 */
export function buildStatsCsv(stats: Stats): string {
  const rows: Cell[][] = [
    ['Báo cáo thống kê Retainly'],
    ['Chỉ số', 'Giá trị'],
    ['Khoảng thời gian', RANGE_LABELS[stats.range]],
    ['Từ ngày', stats.period.from],
    ['Đến ngày', stats.period.to],
    ['Số ngày có ôn', stats.consistency.reviewDays],
    ['Số ngày trong khoảng', stats.consistency.totalDays],
    ['Tỷ lệ ngày có ôn (%)', percent(stats.consistency.rate)],
    ['Chuỗi hiện tại (ngày)', stats.streak.current],
    ['Kỷ lục chuỗi (ngày)', stats.streak.longest],
    ['Thẻ bền vững (S > 30 ngày)', stats.durable.cards],
    ['Tổng số thẻ', stats.durable.totalCards],
    ['Tỷ trọng thẻ bền vững (%)', percent(stats.durable.share)],
    ['Lượt nhớ', stats.recall.remembered],
    ['Tổng lượt ôn', stats.recall.total],
    ['Tỷ lệ nhớ lại (%)', percent(stats.recall.rate)],
    ['Mục tiêu nhớ lại (%)', percent(stats.recall.target)],
    [],
    ['Nhánh kiến thức'],
    [
      'Nhánh',
      'Lượt ôn',
      'Lượt quên',
      'Tỷ lệ quên (%)',
      'Tỷ trọng lượt ôn (%)',
      'Độ khó D trung bình',
      'Thẻ đến hạn',
    ],
    ...stats.topics.map((row) => [
      row.topic.name,
      row.reviews,
      row.forgotten,
      percent(row.forgetRate),
      percent(row.reviewShare),
      round2(row.averageDifficulty),
      row.dueCount,
    ]),
    [],
    ['Lượt ôn tuần này (T2–CN)'],
    ['Ngày', 'Lượt ôn'],
    ...stats.week.map((day) => [day.date, day.reviews]),
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
