import type { ReactNode } from 'react';

import { IconCheck, IconShield, IconToday } from '@src/shared/ui/Icons/Icons';

import { describeRecallGap, formatPeriod, formatRate, type Stats } from '../../domain/stats';

import './StatTiles.css';

/** Khớp `MASTERED_STABILITY_DAYS` của API — chỉ dùng để giải thích trên giao diện. */
const DURABLE_STABILITY_DAYS = 30;

type TileProps = {
  label: string;
  title: string;
  icon: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

function StatTile({ label, title, icon, footer, children }: TileProps) {
  return (
    <article className="stat-tile surface-panel">
      <header className="stat-tile__head">
        <div>
          <p className="stat-tile__label text-caption-caps">{label}</p>
          <h2 className="stat-tile__title text-small">{title}</h2>
        </div>
        <span className="stat-tile__icon icon-disc" aria-hidden="true">
          {icon}
        </span>
      </header>
      <div className="stat-tile__body">{children}</div>
      <p className="stat-tile__footer text-caption">{footer}</p>
    </article>
  );
}

/** Thanh tỷ lệ 0–1; `marker` vẽ thêm vạch mục tiêu. Chỉ để nhìn, con số đã nằm ngay trên. */
function Meter({ ratio, marker }: { ratio: number; marker?: number }) {
  return (
    <span className="stat-tile__meter" aria-hidden="true">
      <span className="stat-tile__meter-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      {marker === undefined ? null : (
        <span className="stat-tile__meter-marker" style={{ left: `${marker * 100}%` }} />
      )}
    </span>
  );
}

function ConsistencyTile({ stats }: { stats: Stats }) {
  const { consistency } = stats;
  const period = formatPeriod(stats.period);

  return (
    <StatTile
      label="Tính kỷ luật"
      title="Tỷ lệ ngày có ôn"
      icon={<IconToday size={16} />}
      footer={period ? `Khoảng ${period}` : 'Chưa có lượt ôn nào'}
    >
      <p className="stat-tile__value">
        <strong className="text-h1">
          {consistency.rate === null ? '—' : formatRate(consistency.rate)}
        </strong>
      </p>
      <p className="stat-tile__hint text-caption">
        {consistency.reviewDays} / {consistency.totalDays} ngày có ôn
      </p>
      {consistency.rate === null ? null : <Meter ratio={consistency.rate} />}
    </StatTile>
  );
}

function StreakTile({ streak }: { streak: Stats['streak'] }) {
  return (
    <StatTile
      label="Kỷ lục thói quen"
      title="Chuỗi ôn dài nhất"
      icon={<span className="stat-tile__emoji">🔥</span>}
      footer={`Chuỗi hiện tại: ${streak.current} ngày`}
    >
      <p className="stat-tile__value">
        <strong className="text-h1">{streak.longest}</strong>
        <span className="text-caption">ngày liên tiếp</span>
      </p>
      <p className="stat-tile__hint text-caption">
        {streak.current >= streak.longest
          ? 'Bạn đang ở chuỗi kỷ lục'
          : 'Chuỗi hiện tại so với kỷ lục'}
      </p>
      {/* Kỷ lục bằng 0 thì màn đã chuyển sang trạng thái rỗng, không tới được đây. */}
      <Meter ratio={streak.current / streak.longest} />
    </StatTile>
  );
}

function DurableTile({ durable }: { durable: Stats['durable'] }) {
  return (
    <StatTile
      label="Vùng bền vững"
      title="Thẻ nhớ sâu"
      icon={<IconShield size={16} />}
      footer={
        durable.share === null
          ? 'Chưa có thẻ nào'
          : `Chiếm ${formatRate(durable.share)} kho thẻ (${durable.totalCards} thẻ)`
      }
    >
      <p className="stat-tile__value">
        <strong className="text-h1">{durable.cards}</strong>
        <span className="text-caption">thẻ</span>
      </p>
      <p className="stat-tile__hint text-caption">
        Đã ôn và có độ ổn định S trên {DURABLE_STABILITY_DAYS} ngày
      </p>
    </StatTile>
  );
}

function RecallTile({ recall }: { recall: Stats['recall'] }) {
  if (recall.rate === null) {
    return (
      <StatTile
        label="Độ chính xác thực nghiệm"
        title="Tỷ lệ nhớ lại"
        icon={<IconCheck size={16} />}
        footer={`Mục tiêu FSRS: ${formatRate(recall.target)}`}
      >
        <p className="stat-tile__value">
          <strong className="text-h1">—</strong>
        </p>
        <p className="stat-tile__hint text-caption">Chưa có lượt ôn trong khoảng này</p>
      </StatTile>
    );
  }

  const gap = describeRecallGap(recall.rate, recall.target);
  const gapText = {
    above: `vượt ${gap.points} điểm`,
    below: `thấp hơn ${gap.points} điểm`,
    equal: 'đúng mục tiêu',
  }[gap.direction];

  return (
    <StatTile
      label="Độ chính xác thực nghiệm"
      title="Tỷ lệ nhớ lại"
      icon={<IconCheck size={16} />}
      footer={
        <>
          Mục tiêu FSRS {formatRate(recall.target)} ·{' '}
          <span className="stat-tile__gap" data-direction={gap.direction}>
            {gapText}
          </span>
        </>
      }
    >
      <p className="stat-tile__value">
        <strong className="text-h1" data-direction={gap.direction}>
          {formatRate(recall.rate)}
        </strong>
        <span className="text-caption">/ {formatRate(recall.target)} mục tiêu</span>
      </p>
      <p className="stat-tile__hint text-caption">
        Nhớ {recall.remembered} / {recall.total} lượt ôn
      </p>
      <Meter ratio={recall.rate} marker={recall.target} />
    </StatTile>
  );
}

/**
 * Bốn ô đầu màn. Tính kỷ luật và Tỷ lệ nhớ lại theo khoảng đang chọn; chuỗi và
 * vùng bền vững là số chụp hiện tại (lịch FSRS không lưu lịch sử).
 */
export function StatTiles({ stats }: { stats: Stats }) {
  return (
    <section className="stat-tiles" aria-label="Chỉ số ghi nhớ">
      <ConsistencyTile stats={stats} />
      <StreakTile streak={stats.streak} />
      <DurableTile durable={stats.durable} />
      <RecallTile recall={stats.recall} />
    </section>
  );
}
