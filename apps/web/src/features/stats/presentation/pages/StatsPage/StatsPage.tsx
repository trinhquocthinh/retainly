import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Button } from '@src/shared/ui/Button/Button';
import { IconArrowRight, IconChart, IconExport, IconNewCard } from '@src/shared/ui/Icons/Icons';
import { SegmentedTabs } from '@src/shared/ui/SegmentedTabs/SegmentedTabs';

import { useStats } from '../../../application/useStats';
import type { StatsRange } from '../../../domain/stats';
import { buildStatsCsv, statsReportFileName } from '../../../domain/statsReport';
import { downloadCsv } from '../../../infrastructure/downloadCsv';
import { fetchStats } from '../../../infrastructure/statsApi';
import { StatTiles } from '../../components/StatTiles/StatTiles';
import { StatsAdvice } from '../../components/StatsAdvice/StatsAdvice';
import { TopicBreakdown } from '../../components/TopicBreakdown/TopicBreakdown';
import { WeekActivity } from '../../components/WeekActivity/WeekActivity';

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
          Tiến bộ của bạn
        </span>
        <h1 className="text-h1">Thống kê học tập</h1>
        <p className="stats__intro text-small">
          Xem nhịp ôn, khả năng nhớ và những chủ đề cần dành thêm thời gian.
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
            <h2 className="text-h2">Chưa có thống kê để xem</h2>
            <p className="text-small">
              Hãy hoàn thành vài lượt ôn đầu tiên để theo dõi tiến bộ của bạn.
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
            aria-label="Tải báo cáo"
            title="Tải báo cáo"
            disabled={view.switching}
            onClick={() => downloadCsv(statsReportFileName(stats), buildStatsCsv(stats))}
          >
            <IconExport />
            <span className="stats__export-label">Tải báo cáo</span>
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
        <span className="stats__eyebrow text-caption-caps">Mẹo ôn hiệu quả</span>
        <h2 className="text-h2">Tự nhớ trước khi xem đáp án</h2>
        <p className="text-small">
          Mỗi lần tự trả lời, bạn đang kiểm tra điều mình thực sự nhớ. Nếu một chủ đề thường bị quên
          hơn, hãy ưu tiên chủ đề đó trong những lượt ôn tiếp theo.
        </p>
      </section>
    </div>
  );
}
