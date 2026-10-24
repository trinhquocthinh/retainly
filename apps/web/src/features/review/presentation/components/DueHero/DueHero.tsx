import { Link } from 'react-router';
import { IconArrowRight, IconCheck, IconNewCard } from '@src/shared/ui/Icons/Icons';
import { summarizeDueTopics, type HomeOverview } from '../../../domain/home';
import type { PracticeOverview } from '../../../domain/practice';
import { TodayProgressBar } from '../TodayProgress/TodayProgress';
import './DueHero.css';

type Props = { dueCount: number; overview: HomeOverview; practice?: PracticeOverview };

export function DueHero({ dueCount, overview, practice }: Props) {
  if (overview.library.totalCards === 0)
    return (
      <section className="due-hero due-hero--quiet surface-raised">
        <div className="due-hero__text">
          <h2 className="text-h2">Bắt đầu với thẻ đầu tiên</h2>
          <p className="text-small">
            Ghi lại điều bạn vừa học thành thẻ hỏi–đáp. Retainly sẽ đưa thẻ trở lại vào những lần ôn
            phù hợp.
          </p>
        </div>
        <Link className="link-button link-button--accent" to="/cards/new">
          <IconNewCard />
          Tạo thẻ mới
        </Link>
      </section>
    );

  const active = practice?.activeSessionId;
  const completed = practice?.completedToday ?? 0;
  const available = practice?.availableCount;
  const canStart = available === undefined || available > 0;
  const count = available === undefined ? null : Math.min(15, available);
  const title = active
    ? 'Tiếp tục bài đang học'
    : completed > 0
      ? 'Đã hoàn thành bài học hôm nay'
      : canStart
        ? 'Bài học hôm nay'
        : 'Hôm nay chưa có thêm thẻ phù hợp';
  const progress = overview.todayProgress;
  const topics = summarizeDueTopics(overview.dueByTopic);

  return (
    <section className="due-hero surface-raised" aria-labelledby="due-hero-title">
      <div className="due-hero__meta text-small">
        <span>
          {completed > 0 ? (
            <>
              <IconCheck /> Đã hoàn thành {completed} bài hôm nay
            </>
          ) : (
            'Một bài học nhỏ mỗi ngày'
          )}
        </span>
      </div>
      <div className="due-hero__text">
        <h2 id="due-hero-title" className="text-h2">
          {title}
        </h2>
        {!active && canStart ? (
          <p className="text-small">
            {count === null ? 'Tối đa 15 thẻ' : `${count} thẻ`} · Ôn kiến thức cũ và học thêm thẻ
            chưa học, tuỳ thư viện của bạn.
          </p>
        ) : null}
        {!canStart && !active ? (
          <p className="text-small">Bạn có thể nghỉ tại đây và quay lại vào ngày tiếp theo.</p>
        ) : null}
        {topics ? (
          <p className="text-small">
            Chủ đề đến hạn: {topics.groups.map((g) => g.name ?? 'Chưa có chủ đề').join(', ')}.
          </p>
        ) : null}
        {dueCount > 0 ? (
          <p className="text-small">
            Thư viện còn {dueCount} thẻ đến hạn; bạn có thể chia thành nhiều bài.
          </p>
        ) : null}
      </div>
      {progress.total > 0 ? (
        <div className="due-hero__progress">
          <div className="due-hero__progress-label text-small">
            <span>Đã ôn hôm nay</span>
            <span className="due-hero__progress-count">
              {progress.reviewed}/{progress.total} thẻ
            </span>
          </div>
          <TodayProgressBar progress={progress} />
        </div>
      ) : null}
      <div className="due-hero__actions">
        {active || canStart ? (
          <Link
            className="link-button link-button--accent"
            to={active ? `/review?session=${encodeURIComponent(active)}` : '/review'}
          >
            {active ? 'Tiếp tục bài học' : completed > 0 ? 'Học thêm một bài' : 'Bắt đầu bài học'}
            <IconArrowRight />
          </Link>
        ) : null}
        {!active && canStart ? (
          <Link className="link-button link-button--outline" to="/review?size=10">
            Bài ngắn · 10 thẻ
          </Link>
        ) : null}
        <Link className="link-button link-button--outline" to="/cards/new">
          <IconNewCard />
          Tạo thẻ mới
        </Link>
      </div>
    </section>
  );
}
