import { Link } from 'react-router';

import { topicReviewLink } from '@src/features/review/domain/review';
import { IconAlert, IconArrowRight, IconCheck, IconClock } from '@src/shared/ui/Icons/Icons';

import { formatRate, pickAdvice, type TopicStats } from '../../domain/stats';

/** Đề xuất rút gọn: một nhánh nên ôn ngay, kèm số thẻ và thời gian ước tính. */
export function StatsAdvice({ topics }: { topics: readonly TopicStats[] }) {
  const advice = pickAdvice(topics);
  if (!advice) return null;

  if (advice.level === 'clear') {
    return (
      <section className="stats-advice surface-panel" data-level="steady" role="note">
        <span className="stats-advice__icon icon-disc" aria-hidden="true">
          <IconCheck size={18} />
        </span>
        <div className="stats-advice__body">
          <span className="stats-advice__eyebrow text-caption-caps">Trạng thái ổn định</span>
          <p className="text-small">
            Không nhánh nào còn thẻ đến hạn hôm nay. FSRS sẽ nhắc bạn khi tới lúc ôn lại.
          </p>
        </div>
      </section>
    );
  }

  const attention = advice.level === 'attention';

  return (
    <section className="stats-advice surface-panel" data-level={advice.level} role="note">
      <span className="stats-advice__icon icon-disc" aria-hidden="true">
        {attention ? <IconAlert size={18} /> : <IconCheck size={18} />}
      </span>

      <div className="stats-advice__body">
        <span className="stats-advice__eyebrow text-caption-caps">
          {attention ? 'Đề xuất ôn tập' : 'Trạng thái ổn định'}
        </span>

        {attention ? (
          <p className="text-small">
            Nhánh <strong>{advice.topic.name}</strong> có tỷ lệ quên cao nhất trong các nhánh còn
            thẻ đến hạn ({formatRate(advice.forgetRate)}) — nên ưu tiên ôn{' '}
            <strong>{advice.dueCount} thẻ</strong> của nhánh này hôm nay.
          </p>
        ) : (
          <p className="text-small">
            Các nhánh còn thẻ đến hạn đều dưới ngưỡng an toàn. Nhánh{' '}
            <strong>{advice.topic.name}</strong> có {advice.dueCount} thẻ đến hạn, tỷ lệ quên chỉ{' '}
            {formatRate(advice.forgetRate)}.
          </p>
        )}

        <p className="stats-advice__meta text-caption">
          <IconClock size={12} />
          Ước tính ~{advice.minutes} phút
        </p>
      </div>

      <Link
        className={`link-button ${attention ? 'link-button--accent' : 'link-button--outline'}`}
        {...topicReviewLink(advice.topic)}
      >
        Ôn {advice.dueCount} thẻ ngay
        <IconArrowRight />
      </Link>
    </section>
  );
}
