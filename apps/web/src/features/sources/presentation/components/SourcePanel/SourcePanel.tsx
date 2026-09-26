import type { RefObject } from 'react';

import { toParagraphs } from '../../../domain/articleText';
import type { ExtractedSource } from '../../../domain/extractedSource';

import './SourcePanel.css';

/** Bề rộng các thanh xương cá, chép từ artboard "Đang bóc tách URL". */
const SKELETON_WIDTHS = ['80%', '100%', '92%', '64%', '88%', '45%'];

type SourcePanelProps = {
  source: ExtractedSource | null;
  loading: boolean;
  contentRef: RefObject<HTMLDivElement | null>;
};

export function SourcePanel({ source, loading, contentRef }: SourcePanelProps) {
  if (loading) {
    return (
      <section className="source-panel surface-panel" aria-busy="true">
        <p className="source-panel__label text-caption">Đang tải nội dung…</p>
        <div className="source-panel__skeleton">
          {SKELETON_WIDTHS.map((width) => (
            <span key={width} className="source-panel__bar" style={{ width }} />
          ))}
        </div>
      </section>
    );
  }

  if (!source) return null;

  return (
    <section className="source-panel surface-panel" aria-label="Nguồn đã bóc tách">
      <p className="source-panel__label text-caption">Nguồn đã bóc tách</p>
      <h2 className="source-panel__title text-h2">{source.title}</h2>

      <div className="source-panel__body" ref={contentRef}>
        {toParagraphs(source.cleanText).map((paragraph, index) => (
          <p key={index} className="source-panel__paragraph">
            {paragraph}
          </p>
        ))}
      </div>

      <p className="source-panel__hint text-caption">
        Bôi đen một đoạn để tự động điền vào mặt trả lời.
      </p>
    </section>
  );
}
