/** Contract của GET /api/topics/forget-rate (E6-S1-T1). Tỷ lệ là thập phân 0..1. */
export type TopicForgetRate = {
  topicId: string;
  topicName: string;
  forgetRate: number;
  totalReviews: number;
};

export type ForgetRateResponse = {
  topics: TopicForgetRate[];
};

/**
 * Sắc thái của một nhánh kiến thức. Ngưỡng đặt theo design statistical:
 * đỏ khi quên từ 20% trở lên, xanh khi dưới hoặc bằng 10%, còn lại trung tính.
 */
export type ForgetTone = 'danger' | 'neutral' | 'success';

const DANGER_FROM = 0.2;
const SUCCESS_UPTO = 0.1;

export type TopicReportRow = {
  topicId: string;
  topicName: string;
  /** 0..100, làm tròn một chữ số thập phân để hiển thị. */
  forgetPercent: number;
  /** Tỷ trọng lượt ôn của topic trên tổng, 0..100, làm tròn số nguyên. */
  sharePercent: number;
  totalReviews: number;
  tone: ForgetTone;
};

export type ForgetRateReport = {
  rows: TopicReportRow[];
  totalReviews: number;
  topicCount: number;
};

function toneOf(forgetRate: number): ForgetTone {
  if (forgetRate >= DANGER_FROM) return 'danger';
  if (forgetRate <= SUCCESS_UPTO) return 'success';
  return 'neutral';
}

/**
 * Chuyển contract API thành dữ liệu sẵn sàng render.
 * Giữ nguyên thứ tự máy chủ trả về — SQL đã sắp giảm dần theo tỷ lệ quên,
 * sắp lại ở đây chỉ tạo ra hai nguồn sự thật cho cùng một quy tắc.
 */
export function buildForgetRateReport(topics: TopicForgetRate[]): ForgetRateReport {
  const totalReviews = topics.reduce((sum, topic) => sum + topic.totalReviews, 0);

  return {
    totalReviews,
    topicCount: topics.length,
    rows: topics.map((topic) => ({
      topicId: topic.topicId,
      topicName: topic.topicName,
      forgetPercent: Math.round(topic.forgetRate * 1000) / 10,
      // Tổng bằng 0 nghĩa là không có topic nào — nhánh này chỉ để chắn chia 0.
      sharePercent: totalReviews === 0 ? 0 : Math.round((topic.totalReviews / totalReviews) * 100),
      totalReviews: topic.totalReviews,
      tone: toneOf(topic.forgetRate),
    })),
  };
}

export type Advice = {
  topicName: string;
  forgetPercent: number;
  /** `attention` khi nhánh đầu bảng còn đáng lo, `steady` khi cả kho đã ổn. */
  level: 'attention' | 'steady';
};

/**
 * Đề xuất rút gọn: chỉ dựa trên nhánh đứng đầu bảng, không bịa thêm số liệu
 * mà API chưa cung cấp (số thẻ cần cứu, thời gian ước tính).
 */
export function buildAdvice(rows: TopicReportRow[]): Advice | null {
  const worst = rows[0];
  if (!worst) return null;

  return {
    topicName: worst.topicName,
    forgetPercent: worst.forgetPercent,
    level: worst.tone === 'success' ? 'steady' : 'attention',
  };
}
