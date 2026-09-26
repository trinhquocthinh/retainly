import { useSession } from '@src/features/auth/application/useSession';
import { fetchSession } from '@src/features/auth/infrastructure/authApi';
import { useLibraryStats } from '@src/features/cards/application/useLibraryStats';
import { fetchLibraryStats } from '@src/features/cards/infrastructure/cardsApi';
import { Button } from '@src/shared/ui/Button/Button';

import { useHomeOverview } from '../../../application/useHomeOverview';
import { countDue } from '../../../domain/home';
import { fetchHomeOverview } from '../../../infrastructure/reviewApi';
import { DueHero } from '../../components/DueHero/DueHero';
import { HomeHeader } from '../../components/HomeHeader/HomeHeader';
import { HomeStats } from '../../components/HomeStats/HomeStats';
import { UpcomingReviews } from '../../components/UpcomingReviews/UpcomingReviews';

import './HomePage.css';

export function HomePage() {
  const overview = useHomeOverview(fetchHomeOverview);
  // Shell chỉ render sau RequireAuth nên phiên đã nằm sẵn trong cache.
  const session = useSession({ fetchSession });
  const retention = useLibraryStats(fetchLibraryStats);

  if (overview.isPending) {
    return (
      <div className="home-skeleton" role="status" aria-label="Đang tải tổng quan hôm nay">
        <div />
        <div />
        <div />
      </div>
    );
  }

  if (overview.isError) {
    return (
      <section className="home-error feedback-danger" role="alert">
        <div>
          <h1 className="text-h2">Không tải được trang Hôm nay</h1>
          <p className="text-small">
            Kiểm tra kết nối rồi thử lại. Dữ liệu ôn tập của bạn không bị thay đổi.
          </p>
        </div>
        <Button onClick={() => void overview.refetch()}>Thử lại</Button>
      </section>
    );
  }

  const data = overview.data;
  const now = new Date();

  return (
    <div className="home">
      <HomeHeader name={session.data?.displayName} streak={data.streak} now={now} />
      <DueHero dueCount={countDue(data.dueByTopic)} overview={data} />

      {data.library.totalCards > 0 ? (
        <>
          <HomeStats library={data.library} retention={retention.stats} />
          <UpcomingReviews cards={data.upcoming} now={now} />
        </>
      ) : null}

      <aside className="home__tip text-small">
        <span aria-hidden="true">💡</span>
        Chỉ cần 5–10 phút mỗi ngày để duy trì nhịp ghi nhớ.
      </aside>
    </div>
  );
}
