import { Link } from 'react-router';

import { topicReviewLink } from '@src/features/review/domain/review';
import { IconAlert, IconArrowRight, IconCheck, IconClock } from '@src/shared/ui/Icons/Icons';

import { pickAdvice, type TopicStats } from '../../../domain/stats';

import './StatsAdvice.css';

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
          <span className="stats-advice__eyebrow text-caption-caps">Mọi thứ đang ổn</span>
          <p className="text-small">
            Hôm nay bạn không còn thẻ nào cần ôn. Retainly sẽ nhắc khi có lượt tiếp theo.
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
          {attention ? 'Gợi ý hôm nay' : 'Mọi thứ đang ổn'}
        </span>

        {attention ? (
          <p className="text-small">
            Bạn thường quên thẻ trong chủ đề <strong>{advice.topic.name}</strong> nhiều hơn các chủ
            đề khác. Hôm nay có <strong>{advice.dueCount} thẻ</strong> phù hợp để ôn lại.
          </p>
        ) : (
          <p className="text-small">
            Các chủ đề hôm nay đều đang tiến triển tốt. Chủ đề <strong>{advice.topic.name}</strong>{' '}
            còn {advice.dueCount} thẻ cần ôn.
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
        Ôn {advice.dueCount} thẻ
        <IconArrowRight />
      </Link>
    </section>
  );
}
