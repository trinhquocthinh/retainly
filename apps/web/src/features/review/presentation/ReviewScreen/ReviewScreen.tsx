import type { ReactNode } from 'react';

import { Logo } from '@src/shared/ui/Logo/Logo';
import { IconClose } from '@src/shared/ui/Icons/Icons';

import { progressPercent } from '../../domain/review';

import './ReviewScreen.css';

type ReviewScreenProps = {
  onExit: () => void;
  /** Nguồn thẻ của phiên, hiện ở chip góc phải: đến hạn hay Ôn thêm. */
  queueLabel: string;
  progress?: { position: number; reviewed: number; total: number };
  children: ReactNode;
};

/**
 * Khung toàn màn hình của phiên ôn tập — không sidebar, không điều hướng phụ.
 * design-criteria §1: màn này là công cụ tập trung, mọi lối rẽ đều là xao nhãng.
 */
export function ReviewScreen({ onExit, queueLabel, progress, children }: ReviewScreenProps) {
  return (
    <div className="review-screen">
      <header className="review-screen__bar">
        <div className="review-screen__lead">
          <Logo size={32} />
          <span className="review-screen__divider" aria-hidden="true" />
          <button type="button" className="review-screen__exit" onClick={onExit}>
            <IconClose size={16} />
            <span className="review-screen__exit-label">Kết thúc phiên</span>
            <kbd>Esc</kbd>
          </button>
        </div>

        {progress ? (
          <div className="review-screen__progress">
            <div className="review-screen__progress-head text-caption">
              <span>Tiến độ ôn tập</span>
              <span className="review-screen__counter">
                {progress.position} / {progress.total}
              </span>
            </div>
            <div
              className="review-screen__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.reviewed}
            >
              <div
                className="review-screen__fill"
                style={{ width: `${progressPercent(progress.reviewed, progress.total)}%` }}
              />
            </div>
          </div>
        ) : null}

        <p className="review-screen__due compact-chip compact-chip--subtle text-caption">
          {queueLabel}
        </p>
      </header>

      <main className="review-screen__stage">{children}</main>

      <footer className="review-screen__legend text-caption">
        Phím tắt: <kbd className="compact-chip compact-chip--subtle key-hint">Space</kbd> Lật thẻ ·{' '}
        <kbd className="compact-chip compact-chip--subtle key-hint">←</kbd> Quên ·{' '}
        <kbd className="compact-chip compact-chip--subtle key-hint">→</kbd> Nhớ ·{' '}
        <kbd className="compact-chip compact-chip--subtle key-hint">Z</kbd> Hoàn tác ·{' '}
        <kbd className="compact-chip compact-chip--subtle key-hint">Esc</kbd> Kết thúc
      </footer>
    </div>
  );
}
