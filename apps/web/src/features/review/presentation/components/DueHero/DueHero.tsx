import { Fragment } from 'react';
import { Link } from 'react-router';

import { IconArrowRight, IconCheck, IconClock, IconNewCard } from '@src/shared/ui/Icons/Icons';

import { summarizeDueTopics, type DueTopicSummary, type HomeOverview } from '../../../domain/home';
import { estimateRemainingMinutes } from '../../../domain/session';
import { TodayProgressBar } from '../TodayProgress/TodayProgress';

import './DueHero.css';

/** "4 thẻ **A**, 3 thẻ **B** và 2 thẻ khác" */
function DueTopicList({ summary }: { summary: DueTopicSummary }) {
  const parts = summary.groups.map((group) => (
    <>
      {group.count} thẻ {group.name ? <strong>{group.name}</strong> : 'chưa gán Topic'}
    </>
  ));

  if (summary.otherCount > 0) parts.push(<>{summary.otherCount} thẻ khác</>);

  return parts.map((part, index) => (
    <Fragment key={index}>
      {index === 0 ? '' : index === parts.length - 1 ? ' và ' : ', '}
      {part}
    </Fragment>
  ));
}

function ProgressSummary({ progress }: { progress: HomeOverview['todayProgress'] }) {
  return (
    <div className="due-hero__progress">
      <div className="due-hero__progress-label text-small">
        <span>Đã ôn hôm nay</span>
        <span className="due-hero__progress-count">
          {progress.reviewed}/{progress.total} thẻ
        </span>
      </div>
      <TodayProgressBar progress={progress} />
    </div>
  );
}

function FirstCardPrompt() {
  return (
    <section className="due-hero due-hero--quiet surface-raised">
      <span className="due-hero__icon" aria-hidden="true">
        <IconNewCard size={22} />
      </span>
      <div className="due-hero__text">
        <h2 className="text-h2">Bắt đầu với thẻ đầu tiên</h2>
        <p className="text-small">
          Ghi lại điều bạn vừa học thành thẻ hỏi–đáp. Retainly sẽ nhắc bạn ôn đúng lúc sắp quên.
        </p>
      </div>
      <div className="due-hero__actions">
        <Link className="link-button link-button--accent" to="/cards/new">
          <IconNewCard />
          Tạo thẻ mới
        </Link>
      </div>
    </section>
  );
}

function CaughtUp({ progress }: { progress: HomeOverview['todayProgress'] }) {
  return (
    <section className="due-hero due-hero--quiet surface-raised">
      <span className="due-hero__icon due-hero__icon--done" aria-hidden="true">
        <IconCheck size={24} />
      </span>
      <div className="due-hero__text">
        <h2 className="text-h2">Bạn đã hoàn thành hôm nay</h2>
        <p className="text-small">
          Không còn thẻ đến hạn. Ôn thêm vài thẻ sắp quên để giữ chuỗi ngày, hoặc tạo thẻ mới cho
          lần ôn sau.
        </p>
        {progress.total > 0 ? <ProgressSummary progress={progress} /> : null}
      </div>
      <div className="due-hero__actions">
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
  );
}

/** Khối chính của Trang chủ: hàng đợi hôm nay, hết việc, hoặc chưa có thẻ nào. */
export function DueHero({ dueCount, overview }: { dueCount: number; overview: HomeOverview }) {
  if (overview.library.totalCards === 0) return <FirstCardPrompt />;
  if (dueCount === 0) return <CaughtUp progress={overview.todayProgress} />;

  const minutes = estimateRemainingMinutes({ remaining: dueCount, reviewed: 0, elapsedMs: 0 });
  const summary = summarizeDueTopics(overview.dueByTopic);

  return (
    <section className="due-hero surface-raised" aria-labelledby="due-hero-title">
      <div className="due-hero__meta text-small">
        <span className="due-hero__estimate">
          <IconClock />
          Ước tính ~{minutes} phút
        </span>
        <span className="due-hero__engine text-caption">FSRS-6</span>
      </div>

      <div>
        <h2 id="due-hero-title" className="due-hero__count">
          <strong className="text-display">{dueCount}</strong>
          <span>thẻ đến hạn ôn tập hôm nay</span>
        </h2>
        {summary ? (
          <p className="due-hero__topics text-small">
            Gồm <DueTopicList summary={summary} />.
          </p>
        ) : null}
      </div>

      <ProgressSummary progress={overview.todayProgress} />

      <Link className="link-button link-button--accent due-hero__start" to="/review">
        Bắt đầu ôn tập
        <IconArrowRight />
      </Link>
    </section>
  );
}
