import type { ReactNode } from 'react';

import { type InlineSegment, parseInlineMarkdown } from './MarkdownSyntax';

import './InlineMarkdown.css';

/** `blank`: đoạn đục lỗ thành chỗ trống (mặt hỏi); `reveal`: điền sẵn và tô nổi bật. */
type ClozeMode = 'blank' | 'reveal';

function renderSegments(segments: InlineSegment[], cloze: ClozeMode): ReactNode[] {
  return segments.map((segment, index) => {
    switch (segment.kind) {
      case 'text':
        return segment.text;
      case 'code':
        return (
          <code key={index} className="inline-markdown-code">
            {segment.text}
          </code>
        );
      case 'strong':
        return <strong key={index}>{renderSegments(segment.children, cloze)}</strong>;
      case 'em':
        return <em key={index}>{renderSegments(segment.children, cloze)}</em>;
      case 'cloze':
        // Chỗ trống không mang chữ của đáp án, kể cả độ dài, để không lộ khi còn ở mặt hỏi.
        return cloze === 'blank' ? (
          <span key={index} className="inline-markdown-blank" role="img" aria-label="chỗ trống">
            [ … ]
          </span>
        ) : (
          <mark key={index} className="inline-markdown-cloze">
            {renderSegments(segment.children, cloze)}
          </mark>
        );
    }
  });
}

/**
 * Hiển thị nội dung thẻ đã định dạng. Chỉ sinh `<strong>`, `<em>`, `<code>`,
 * `<mark>`, `<span>` — đều là phrasing content nên đặt được bên trong `<button>`.
 */
export function InlineMarkdown({ text, cloze = 'reveal' }: { text: string; cloze?: ClozeMode }) {
  return <>{renderSegments(parseInlineMarkdown(text), cloze)}</>;
}
