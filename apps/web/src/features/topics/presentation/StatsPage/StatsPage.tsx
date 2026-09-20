import { Link } from 'react-router';

import { Button } from '@src/shared/ui/Button/Button';
import {
  IconAlert,
  IconArrowRight,
  IconChart,
  IconCheck,
  IconNewCard,
} from '@src/shared/ui/Icons/Icons';

import { useTopicForgetRates } from '../../application/useTopicForgetRates';
import { fetchTopicForgetRates } from '../../infrastructure/topicsApi';
import { ForgettingCurve } from './ForgettingCurve';

import './StatsPage.css';

/** Bảng màu chấm nhánh kiến thức có 4 bậc; nhiều topic hơn thì quay vòng. */
const COLOR_STEPS = 4;

function colorOf(index: number): number {
  return (index % COLOR_STEPS) + 1;
}

/** 14.8 → "14,8". Tự đổi dấu thập phân thay vì Intl để kết quả luôn ổn định. */
function formatPercent(value: number): string {
  return String(value).replace('.', ',');
}

export function StatsPage() {
  const stats = useTopicForgetRates({ fetchTopicForgetRates });

  if (stats.loading) {
    return (
      <div className="stats-skeleton" role="status" aria-label="Đang tải báo cáo thống kê">
        <div />
        <div />
        <div />
      </div>
    );
  }

  if (stats.failed) {
    return (
      <section className="stats-error feedback-danger" role="alert">
        <div>
          <h1 className="text-h2">Không tải được báo cáo thống kê</h1>
          <p className="text-small">
            Kiểm tra kết nối rồi thử lại. Dữ liệu ôn tập của bạn không bị thay đổi.
          </p>
        </div>
        <Button onClick={stats.reload}>Thử lại</Button>
      </section>
    );
  }

  const { report, advice } = stats;

  return (
    <div className="stats">
      <header className="stats__heading">
        <span className="stats__eyebrow text-caption-caps">
          <IconChart size={14} />
          Báo cáo tỷ lệ quên
        </span>
        <h1 className="text-h1">Thống kê &amp; Hiệu quả ghi nhớ</h1>
        <p className="stats__intro text-small">
          Dữ liệu phản ánh độ vững chắc của trí nhớ qua từng chu kỳ ôn tập ngắt quãng.
        </p>
      </header>

      {report.topicCount === 0 ? (
        <section className="stats__empty surface-panel">
          <span className="stats__empty-icon icon-disc" aria-hidden="true">
            <IconChart size={20} />
          </span>
          <div>
            <h2 className="text-h2">Chưa có đủ dữ liệu ôn tập để tổng hợp</h2>
            <p className="text-small">
              Báo cáo xuất hiện sau khi bạn hoàn tất những lượt ôn đầu tiên trên một chủ đề.
            </p>
          </div>
          <Link className="stats__cta" to="/cards/new">
            <IconNewCard />
            Tạo thẻ mới
          </Link>
        </section>
      ) : (
        <>
          <section className="stats__panel surface-panel" aria-labelledby="stats-topics-title">
            <div className="stats__panel-head">
              <div>
                <h2 className="text-h2" id="stats-topics-title">
                  Tỷ lệ quên theo nhánh kiến thức
                </h2>
                <p className="stats__panel-note text-caption">
                  Phân bổ trọng số sai sót của từng bộ chủ đề, sắp xếp giảm dần theo tỷ lệ quên.
                </p>
              </div>
              <span className="stats__badge text-caption">Tổng: {report.topicCount} chủ đề</span>
            </div>

            <div className="stats-bar" aria-hidden="true">
              {report.rows.map((row, index) => (
                <span
                  key={row.topicId}
                  className="stats-bar__segment"
                  data-color={colorOf(index)}
                  style={{ width: `${row.sharePercent}%` }}
                />
              ))}
            </div>

            <ul className="stats-topics">
              {report.rows.map((row, index) => (
                <li className="stats-topics__row" key={row.topicId}>
                  <span
                    className="stats-topics__dot"
                    data-color={colorOf(index)}
                    aria-hidden="true"
                  />
                  <div className="stats-topics__label">
                    <span className="stats-topics__name text-small">{row.topicName}</span>
                    <span className="stats-topics__metric text-caption" data-tone={row.tone}>
                      Tỷ lệ quên: {formatPercent(row.forgetPercent)}% • {row.totalReviews} lượt ôn
                    </span>
                  </div>
                  <div className="stats-topics__share">
                    <span className="stats-topics__share-value text-small">
                      {row.sharePercent}%
                    </span>
                    <span className="stats-topics__share-note text-caption">tỷ trọng</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {advice ? (
            <section className="stats-advice surface-panel" data-level={advice.level} role="note">
              <span className="stats-advice__icon icon-disc" aria-hidden="true">
                {advice.level === 'attention' ? <IconAlert size={18} /> : <IconCheck size={18} />}
              </span>

              <div className="stats-advice__body">
                <span className="stats-advice__eyebrow text-caption-caps">
                  {advice.level === 'attention' ? 'Đề xuất ôn tập' : 'Trạng thái ổn định'}
                </span>

                {advice.level === 'attention' ? (
                  <p className="text-small">
                    Nhánh <strong>{advice.topicName}</strong> đang có tỷ lệ quên cao nhất (
                    {formatPercent(advice.forgetPercent)}%) — nên ưu tiên ôn thêm nhánh này hôm nay.
                  </p>
                ) : (
                  <p className="text-small">
                    Nhánh <strong>{advice.topicName}</strong> dẫn đầu bảng mà tỷ lệ quên chỉ{' '}
                    {formatPercent(advice.forgetPercent)}% — cả kho thẻ đang trong vùng an toàn.
                  </p>
                )}
              </div>

              <Link className="stats-advice__link text-small" to="/review">
                Ôn tập ngay
                <IconArrowRight />
              </Link>
            </section>
          ) : null}
        </>
      )}

      <section className="stats__panel surface-panel" aria-labelledby="stats-curve-title">
        <div className="stats__panel-head">
          <div>
            <h2 className="text-h2" id="stats-curve-title">
              Mô phỏng đường cong lãng quên Ebbinghaus vs FSRS
            </h2>
            <p className="stats__panel-note text-caption">
              Can thiệp đúng nhịp vào điểm rơi trí nhớ giúp biến đường dốc thoái trào thành đường
              gần như nằm ngang.
            </p>
          </div>
        </div>

        <ul className="stats-curve__legend text-caption">
          <li>
            <span className="stats-curve__swatch" data-series="natural" aria-hidden="true" />
            Quên tự nhiên (Ebbinghaus)
          </li>
          <li>
            <span className="stats-curve__swatch" data-series="spaced" aria-hidden="true" />
            Khoảng lặp FSRS
          </li>
        </ul>

        <div className="stats-curve">
          <ForgettingCurve />
        </div>

        <p className="stats-curve__caption text-caption">
          Trục hoành: khoảng thời gian giãn cách (ngày) • Trục tung: xác suất nhớ lại. Đây là hình
          minh hoạ khái niệm, không phải số liệu ôn tập của bạn.
        </p>
      </section>

      <section className="stats__note surface-panel">
        <span className="stats__eyebrow text-caption-caps">Bí quyết củng cố trí nhớ dài hạn</span>
        <h2 className="text-h2">Đọc lại thụ động không tạo ra nơ-ron mới</h2>
        <p className="text-small">
          Chính khoảnh khắc não bộ nỗ lực trích xuất ký ức tại thời điểm sắp quên mới kích hoạt quá
          trình bọc myelin cho các sợi trục thần kinh. Tỷ lệ quên cao ở một nhánh là tín hiệu nên
          tăng nhịp ôn, không phải tín hiệu bạn học kém.
        </p>
      </section>
    </div>
  );
}
