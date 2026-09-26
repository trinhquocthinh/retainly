import type { ReactNode } from 'react';

import { formatPercent, formatStability } from '@src/shared/utils/format';

import { MASTERED_STABILITY_DAYS, type LibraryStats as Stats } from '../../../domain/libraryStats';

import './LibraryStats.css';

const TILE_COUNT = 4;

function StatTile({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint: string;
  tone?: 'danger';
}) {
  return (
    <div className="library-stats__tile surface-panel">
      <dt className="text-caption-caps">{label}</dt>
      <dd className="library-stats__value">
        <span className="text-h1">{value}</span>
        {unit ? <span className="library-stats__unit text-caption">{unit}</span> : null}
      </dd>
      <dd className="library-stats__hint text-caption" data-tone={tone}>
        {hint}
      </dd>
    </div>
  );
}

/** Bốn ô số liệu đầu Thư viện; chưa ôn thẻ nào thì hiện "—" thay vì 0%. */
export function LibraryStats({ stats, loading }: { stats: Stats | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="library-stats" aria-hidden="true">
        {Array.from({ length: TILE_COUNT }, (_, index) => (
          <div className="library-stats__tile library-stats__skeleton surface-panel" key={index} />
        ))}
      </div>
    );
  }

  if (!stats || stats.totalCards === 0) return null;

  const reviewedHint =
    stats.reviewedCards === 0 ? 'Chưa ôn thẻ nào' : `Trên ${stats.reviewedCards} thẻ đã ôn`;

  return (
    <dl className="library-stats" aria-label="Số liệu thư viện">
      <StatTile
        label="Cần ôn hôm nay"
        value={stats.dueToday}
        unit="thẻ"
        hint={stats.overdue > 0 ? `Trong đó ${stats.overdue} quá hạn` : 'Không có thẻ quá hạn'}
        tone={stats.overdue > 0 ? 'danger' : undefined}
      />
      <StatTile
        label="Khả năng nhớ"
        value={
          stats.averageRetrievability === null ? '—' : formatPercent(stats.averageRetrievability)
        }
        hint={reviewedHint}
      />
      <StatTile
        label="Thời gian nhớ vững"
        value={stats.averageStability === null ? '—' : formatStability(stats.averageStability)}
        hint={reviewedHint}
      />
      <StatTile
        label="Đã nhớ vững"
        value={stats.masteredCards}
        unit={`/ ${stats.totalCards} thẻ`}
        hint={`${formatPercent(stats.masteredCards / stats.totalCards)} · nhớ vững trên ${MASTERED_STABILITY_DAYS} ngày`}
      />
    </dl>
  );
}
