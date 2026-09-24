import { Link } from 'react-router';

import { formatDifficulty, formatPercent } from '@src/features/review/domain/memory';
import { topicReviewLink } from '@src/features/review/domain/review';
import { Button } from '@src/shared/ui/Button/Button';
import { IconArrowRight } from '@src/shared/ui/Icons/Icons';

import { forgetTone, formatRate, type Stats, type TopicStats } from '../../domain/stats';

import './TopicBreakdown.css';

/** Bảng màu chấm nhánh kiến thức có 4 bậc; nhiều topic hơn thì quay vòng. */
const COLOR_STEPS = 4;

function colorOf(index: number): number {
  return (index % COLOR_STEPS) + 1;
}

function TopicRow({ row, index }: { row: TopicStats; index: number }) {
  return (
    <li className="topic-breakdown__row">
      <span className="topic-breakdown__dot" data-color={colorOf(index)} aria-hidden="true" />
      <div className="topic-breakdown__label">
        <span className="topic-breakdown__name text-small">{row.topic.name}</span>
        <span className="topic-breakdown__metric text-caption">
          <span data-tone={forgetTone(row.forgetRate)}>
            Tỷ lệ quên: {formatRate(row.forgetRate)}
          </span>
          {row.averageDifficulty === null
            ? null
            : ` • Độ khó D: ${formatDifficulty(row.averageDifficulty)}/10`}
        </span>
      </div>
      <div className="topic-breakdown__share">
        <span className="topic-breakdown__share-value text-small">
          {formatPercent(row.reviewShare)}
        </span>
        <span className="topic-breakdown__share-note text-caption">{row.reviews} lượt ôn</span>
      </div>
      <div className="topic-breakdown__action">
        {row.dueCount > 0 ? (
          <Link
            className="link-button link-button--outline topic-breakdown__review"
            {...topicReviewLink(row.topic)}
            aria-label={`Ôn ngay ${row.dueCount} thẻ đến hạn của nhánh ${row.topic.name}`}
          >
            Ôn ngay ({row.dueCount})
            <IconArrowRight size={14} />
          </Link>
        ) : (
          <span className="topic-breakdown__idle text-caption">Không có thẻ đến hạn</span>
        )}
      </div>
    </li>
  );
}

type TopicBreakdownProps = {
  stats: Stats;
  onShowAll: () => void;
};

/** Tỷ lệ quên, độ khó và tỷ trọng lượt ôn theo nhánh (BR-019) kèm lối "Ôn ngay". */
export function TopicBreakdown({ stats, onShowAll }: TopicBreakdownProps) {
  const { topics } = stats;

  return (
    <section className="topic-breakdown surface-panel" aria-labelledby="topic-breakdown-title">
      <div className="topic-breakdown__head">
        <div>
          <h2 className="text-h2" id="topic-breakdown-title">
            Tỷ lệ quên &amp; Độ khó theo nhánh kiến thức
          </h2>
          <p className="topic-breakdown__note text-caption">
            Sắp giảm dần theo tỷ lệ quên. Tỷ trọng tính trên lượt ôn của các nhánh trong khoảng.
          </p>
        </div>
        {topics.length > 0 ? (
          <span className="topic-breakdown__badge text-caption">{topics.length} chủ đề</span>
        ) : null}
      </div>

      {topics.length === 0 ? (
        <div className="topic-breakdown__empty">
          <p className="text-small">
            {stats.recall.total === 0
              ? 'Không có lượt ôn nào trong 30 ngày gần nhất.'
              : 'Các lượt ôn trong khoảng này đều thuộc thẻ chưa gán nhánh kiến thức.'}
          </p>
          {stats.range === '30d' ? (
            <Button onClick={onShowAll}>Xem toàn bộ thời gian</Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="topic-breakdown__bar" aria-hidden="true">
            {topics.map((row, index) => (
              <span
                key={row.topic.id}
                className="topic-breakdown__segment"
                data-color={colorOf(index)}
                style={{ width: `${row.reviewShare * 100}%` }}
              />
            ))}
          </div>

          <ul className="topic-breakdown__list">
            {topics.map((row, index) => (
              <TopicRow key={row.topic.id} row={row} index={index} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
