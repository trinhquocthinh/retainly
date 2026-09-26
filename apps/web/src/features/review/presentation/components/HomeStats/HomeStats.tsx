import type { ReactNode } from 'react';
import { Link } from 'react-router';

import type { LibraryStats } from '@src/features/cards/domain/libraryStats';
import { formatDifficulty, formatPercent } from '@src/shared/utils/format';

import { DIFFICULT_CARD_THRESHOLD, type HomeOverview } from '../../../domain/home';

import './HomeStats.css';

type TileProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  children: ReactNode;
  aside?: ReactNode;
};

function HomeTile({ label, value, unit, children, aside }: TileProps) {
  return (
    <div className="home-stats__tile surface-panel">
      <div className="home-stats__body">
        <dt className="text-caption-caps">{label}</dt>
        <dd className="home-stats__value">
          <span className="text-h1">{value}</span>
          {unit ? <span className="text-caption">{unit}</span> : null}
        </dd>
        <dd className="home-stats__hint text-caption">{children}</dd>
      </div>
      {aside}
    </div>
  );
}

/** Vòng tròn phần trăm; chỉ để nhìn, con số đã nằm ngay bên cạnh. */
function RetentionRing({ ratio }: { ratio: number }) {
  return (
    <svg className="home-stats__ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15.9155" pathLength="100" />
      <circle
        className="home-stats__ring-value"
        cx="18"
        cy="18"
        r="15.9155"
        pathLength="100"
        strokeDasharray={`${Math.round(ratio * 100)} 100`}
      />
    </svg>
  );
}

type HomeStatsProps = {
  library: HomeOverview['library'];
  /** `undefined` khi `/api/cards/stats` chưa về hoặc lỗi — ô đó ẩn đi, các ô khác vẫn hiện. */
  retention: LibraryStats | undefined;
};

export function HomeStats({ library, retention }: HomeStatsProps) {
  const averageR = retention?.averageRetrievability ?? null;

  return (
    <dl className="home-stats" aria-label="Tổng quan thư viện">
      <HomeTile label="Tổng thẻ" value={library.totalCards} unit="thẻ">
        {library.topicCount > 0 ? `Chia trên ${library.topicCount} chủ đề` : 'Chưa chia chủ đề'}
      </HomeTile>

      {retention ? (
        <HomeTile
          label="Tỷ lệ lưu giữ"
          value={averageR === null ? '—' : formatPercent(averageR)}
          aside={averageR === null ? undefined : <RetentionRing ratio={averageR} />}
        >
          {retention.reviewedCards === 0
            ? 'Chưa ôn thẻ nào'
            : `Độ nhớ trung bình của ${retention.reviewedCards} thẻ đã ôn`}
        </HomeTile>
      ) : null}

      <HomeTile label="Cần củng cố gấp" value={library.difficultCards} unit="thẻ">
        Độ khó D &gt; {formatDifficulty(DIFFICULT_CARD_THRESHOLD)}
        {library.difficultCards > 0 ? (
          <>
            {' · '}
            <Link to="/cards?sort=difficulty">Xem thẻ khó</Link>
          </>
        ) : null}
      </HomeTile>
    </dl>
  );
}
