import { Link } from 'react-router';

import { useHomeOverview } from '../../application/useHomeOverview';
import { fetchCurrentStreak, fetchDueCards } from '../../infrastructure/reviewApi';
import { IconArrowRight, IconCheck, IconNewCard, IconToday } from '@src/shared/ui/Icons/Icons';
import { Button } from '@src/shared/ui/Button/Button';

import './HomePage.css';

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function estimateMinutes(dueCount: number): number {
  return dueCount === 0 ? 0 : Math.max(1, Math.ceil(dueCount / 2));
}

export function HomePage() {
  const overview = useHomeOverview({
    fetchDueCards,
    fetchCurrentStreak,
  });

  if (overview.loading) {
    return (
      <div className="home-skeleton" role="status" aria-label="Đang tải tổng quan hôm nay">
        <div />
        <div />
        <div />
      </div>
    );
  }

  if (overview.failed) {
    return (
      <section className="home-error feedback-danger" role="alert">
        <div>
          <h1 className="text-h2">Không tải được trang Hôm nay</h1>
          <p className="text-small">
            Kiểm tra kết nối rồi thử lại. Dữ liệu ôn tập của bạn không bị thay đổi.
          </p>
        </div>
        <Button onClick={overview.reload}>Thử lại</Button>
      </section>
    );
  }

  const minutes = estimateMinutes(overview.dueCount);

  return (
    <div className="home">
      <header className="home__heading">
        <div>
          <h1 className="text-h1">Hôm nay</h1>
          <p className="home__date text-small">{DATE_FORMATTER.format(new Date())}</p>
        </div>

        <div className="home__streak-pill" aria-label={`Chuỗi ${overview.currentStreak} ngày`}>
          <span className="home__streak-dot" aria-hidden="true" />
          <span aria-hidden="true">🔥</span>
          <span>Chuỗi {overview.currentStreak} ngày</span>
        </div>
      </header>

      {overview.dueCount === 0 ? (
        <section className="home__empty surface-raised">
          <span className="home__empty-icon" aria-hidden="true">
            <IconCheck size={24} />
          </span>
          <div>
            <h2 className="text-h2">Bạn đã hoàn thành hôm nay</h2>
            <p className="text-small">
              Không còn thẻ đến hạn. Ôn thêm vài thẻ sắp quên để giữ chuỗi ngày, hoặc tạo thẻ mới
              cho lần ôn sau.
            </p>
          </div>
          <div className="home__empty-actions">
            <Link className="link-button link-button--accent" to="/review/extra">
              Ôn thêm 5 thẻ sắp quên
              <IconArrowRight />
            </Link>
            <Link className="link-button link-button--outline" to="/cards/new">
              <IconNewCard />
              Tạo thẻ mới
            </Link>
          </div>
        </section>
      ) : (
        <section className="home__due surface-raised">
          <div className="home__due-content">
            <div>
              <div className="home__due-summary">
                <strong className="text-display">{overview.dueCount}</strong>
                <span>thẻ đến hạn — khoảng {minutes} phút</span>
              </div>
              <p className="home__due-note text-caption">
                Ôn đều một ít mỗi ngày giúp củng cố trí nhớ dài hạn.
              </p>
            </div>

            <Link className="home__primary-link" to="/review">
              Bắt đầu ôn tập
              <IconArrowRight />
            </Link>
          </div>
        </section>
      )}

      <section className="home__streak-panel surface-panel">
        <div className="home__streak-title">
          <span className="home__streak-icon" aria-hidden="true">
            <IconToday size={20} />
          </span>
          <h2 className="text-h2">Chuỗi ngày ôn tập</h2>
        </div>

        <div className="home__streak-value">
          <strong className="text-display">{overview.currentStreak}</strong>
          <span>ngày</span>
        </div>

        <p className="home__streak-note text-small">
          Chuỗi được giữ khi bạn ôn tập đều đặn và cho phép tối đa một ngày nghỉ liên tiếp.
        </p>
      </section>

      <aside className="home__tip text-small">
        <span aria-hidden="true">💡</span>
        Chỉ cần 5–10 phút mỗi ngày để duy trì nhịp ghi nhớ.
      </aside>
    </div>
  );
}
