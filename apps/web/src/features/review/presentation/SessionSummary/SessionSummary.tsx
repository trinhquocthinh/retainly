import { formatDuration, type SessionTally } from '../../domain/session';

import './SessionSummary.css';

type SessionSummaryProps = { tally: SessionTally; elapsedMs: number };

/**
 * Tổng kết phiên ở màn hoàn thành. Chỉ dùng số đếm ngay trên máy khách, không
 * gọi thêm API: tỷ lệ nhớ toàn bộ thẻ và streak là việc của Trang chủ (E10).
 */
export function SessionSummary({ tally, elapsedMs }: SessionSummaryProps) {
  return (
    <dl className="session-summary" aria-label="Tổng kết phiên">
      <div className="session-summary__item">
        <dt className="text-caption">Đã ôn</dt>
        <dd>{tally.reviewed} thẻ</dd>
      </div>
      <div className="session-summary__item">
        <dt className="text-caption">Nhớ / Quên</dt>
        <dd>
          <span className="session-summary__remembered">{tally.remembered}</span>
          {' / '}
          <span className="session-summary__forgotten">{tally.forgotten}</span>
        </dd>
      </div>
      <div className="session-summary__item">
        <dt className="text-caption">Thời gian</dt>
        <dd>{formatDuration(elapsedMs)}</dd>
      </div>
    </dl>
  );
}
