import { useHomeOverview } from '../../application/useHomeOverview';
import type { TodayProgress } from '../../domain/home';
import { fetchHomeOverview } from '../../infrastructure/reviewApi';

import './TodayProgress.css';

/** Thanh "đã ôn / tổng hôm nay" (US-016). `total` bằng 0 thì không có gì để đo. */
export function TodayProgressBar({ progress }: { progress: TodayProgress }) {
  const { reviewed, total } = progress;

  return (
    <div
      className="today-progress"
      role="progressbar"
      aria-label="Tiến độ hôm nay"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={reviewed}
      aria-valuetext={`Đã ôn ${reviewed} trên ${total} thẻ`}
    >
      <span
        className="today-progress__fill"
        style={{ width: `${Math.round((reviewed / total) * 100)}%` }}
      />
    </div>
  );
}

/** Khối tiến độ và chuỗi ngày ở sidebar. Lỗi thì ẩn, không chặn cả shell. */
export function SidebarProgress() {
  const { data } = useHomeOverview(fetchHomeOverview);

  if (!data) return null;

  const { todayProgress, streak } = data;

  return (
    <section className="sidebar-progress" aria-label="Tiến độ hôm nay">
      <div className="sidebar-progress__row">
        <span className="text-caption-caps">Hôm nay</span>
        {todayProgress.total > 0 ? (
          <span className="sidebar-progress__count">
            {todayProgress.reviewed}/{todayProgress.total}
          </span>
        ) : null}
      </div>
      {todayProgress.total > 0 ? (
        <TodayProgressBar progress={todayProgress} />
      ) : (
        <p className="sidebar-progress__note text-caption">Không có thẻ đến hạn</p>
      )}
      <p className="sidebar-progress__note text-caption">
        <span aria-hidden="true">🔥</span> Chuỗi {streak.current} ngày · Kỷ lục {streak.longest}
      </p>
    </section>
  );
}
