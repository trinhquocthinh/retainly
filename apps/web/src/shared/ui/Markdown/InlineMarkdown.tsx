import type { ReactNode } from 'react';

import { type InlineSegment, parseInlineMarkdown } from './MarkdownSyntax';

import './InlineMarkdown.css';

function renderSegments(segments: InlineSegment[]): ReactNode[] {
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
        return <strong key={index}>{renderSegments(segment.children)}</strong>;
      case 'em':
        return <em key={index}>{renderSegments(segment.children)}</em>;
    }
  });
}

/**
 * Hiển thị nội dung thẻ đã định dạng. Chỉ sinh `<strong>`, `<em>`, `<code>` —
 * đều là phrasing content nên đặt được bên trong `<button>`.
 */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderSegments(parseInlineMarkdown(text))}</>;
}
