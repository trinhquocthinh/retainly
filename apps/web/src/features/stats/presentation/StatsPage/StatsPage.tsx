import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Button } from '@src/shared/ui/Button/Button';
import { IconArrowRight, IconChart, IconExport, IconNewCard } from '@src/shared/ui/Icons/Icons';
import { SegmentedTabs } from '@src/shared/ui/SegmentedTabs/SegmentedTabs';

import { useStats } from '../../application/useStats';
import type { StatsRange } from '../../domain/stats';
import { buildStatsCsv, statsReportFileName } from '../../domain/statsReport';
import { downloadCsv } from '../../infrastructure/downloadCsv';
import { fetchStats } from '../../infrastructure/statsApi';
import { StatTiles } from './StatTiles';
import { StatsAdvice } from './StatsAdvice';
import { TopicBreakdown } from './TopicBreakdown';
import { WeekActivity } from './WeekActivity';

import './StatsPage.css';

const RANGE_TABS = [
  { value: '30d', label: '30 ngày gần nhất' },
  { value: 'all', label: 'Toàn bộ thời gian' },
] as const satisfies readonly { value: StatsRange; label: string }[];

function StatsHeading({ children }: { children?: ReactNode }) {
  return (
    <header className="stats__heading">
      <div className="stats__title">
        <span className="stats__eyebrow text-caption-caps">
          <IconChart size={14} />
          Hiệu quả ghi nhớ · FSRS-6
        </span>
        <h1 className="text-h1">Thống kê &amp; Hiệu quả ghi nhớ</h1>
        <p className="stats__intro text-small">
          Kỷ luật, tỷ lệ nhớ lại và bảng nhánh tính theo khoảng đã chọn; chuỗi ôn và vùng bền vững
          là số liệu hiện tại.
        </p>
      </div>
      {children}
    </header>
  );
}

export function StatsPage() {
  const view = useStats({ fetchStats });

  if (view.loading) {
    return (
      <div className="stats-skeleton" role="status" aria-label="Đang tải thống kê">
        <div />
        <div />
        <div />
      </div>
    );
  }

  if (view.failed || !view.stats) {
    return (
      <section className="stats-error feedback-danger" role="alert">
        <div>
          <h1 className="text-h2">Không tải được thống kê</h1>
          <p className="text-small">
            Kiểm tra kết nối rồi thử lại. Dữ liệu ôn tập của bạn không bị thay đổi.
          </p>
        </div>
        <Button onClick={view.reload}>Thử lại</Button>
      </section>
    );
  }

  const { stats } = view;

  // Kỷ lục chuỗi đếm mọi ngày có ôn, nên bằng 0 nghĩa là chưa ôn lần nào.
  if (stats.streak.longest === 0) {
    return (
      <div className="stats">
        <StatsHeading />
        <section className="stats__empty surface-panel">
          <span className="stats__empty-icon icon-disc" aria-hidden="true">
            <IconChart size={20} />
          </span>
          <div>
            <h2 className="text-h2">Chưa có đủ dữ liệu ôn tập để tổng hợp</h2>
            <p className="text-small">
              Thống kê xuất hiện sau khi bạn hoàn tất những lượt ôn đầu tiên.
            </p>
          </div>
          <div className="stats__empty-actions">
            <Link className="link-button link-button--accent" to="/review">
              Bắt đầu ôn tập
              <IconArrowRight />
            </Link>
            <Link className="link-button link-button--outline" to="/cards/new">
              <IconNewCard />
              Tạo thẻ mới
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="stats" aria-busy={view.switching}>
      <StatsHeading>
        <div className="stats__actions">
          <SegmentedTabs
            label="Khoảng thời gian"
            tabs={RANGE_TABS}
            value={view.range}
            onChange={view.setRange}
            className="stats__range"
          />
          {/* Đang đổi khoảng thì số trên màn còn là khoảng cũ, chưa cho xuất. */}
          <Button
            aria-label="Xuất báo cáo CSV"
            title="Xuất báo cáo CSV"
            disabled={view.switching}
            onClick={() => downloadCsv(statsReportFileName(stats), buildStatsCsv(stats))}
          >
            <IconExport />
            <span className="stats__export-label">Xuất báo cáo</span>
          </Button>
        </div>
      </StatsHeading>

      <StatTiles stats={stats} />

      <div className="stats__grid">
        <TopicBreakdown stats={stats} onShowAll={() => view.setRange('all')} />
        <div className="stats__side">
          <StatsAdvice topics={stats.topics} />
          <WeekActivity week={stats.week} now={new Date()} />
        </div>
      </div>

      <section className="stats__note surface-panel">
        <span className="stats__eyebrow text-caption-caps">Bí quyết củng cố trí nhớ dài hạn</span>
        <h2 className="text-h2">Đọc lại thụ động không tạo ra nơ-ron mới</h2>
        <p className="text-small">
          Chính khoảnh khắc não bộ nỗ lực trích xuất ký ức tại thời điểm sắp quên mới kích hoạt quá
          trình bọc myelin cho các sợi trục thần kinh. FSRS nhắc bạn ôn đúng lúc xác suất nhớ sắp
          tụt dưới 90% — tỷ lệ quên cao ở một nhánh là tín hiệu nên tăng nhịp ôn, không phải tín
          hiệu bạn học kém.
        </p>
      </section>
    </div>
  );
}
