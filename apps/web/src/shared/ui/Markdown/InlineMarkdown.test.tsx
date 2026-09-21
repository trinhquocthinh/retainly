import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InlineMarkdown } from './InlineMarkdown';

describe('E7-S1-T1 — <InlineMarkdown>', () => {
  it('dựng phần tử React cho đậm, nghiêng, code', () => {
    const { container } = render(<InlineMarkdown text="**Đậm** *nghiêng* `code`" />);

    expect(container.querySelector('strong')).toHaveTextContent('Đậm');
    expect(container.querySelector('em')).toHaveTextContent('nghiêng');
    expect(container.querySelector('code')).toHaveTextContent('code');
    expect(container).toHaveTextContent('Đậm nghiêng code');
  });

  it('HTML và cú pháp ảnh hiển thị nguyên văn, không tạo phần tử', () => {
    const payload = '<img src=x onerror="alert(1)"> ![ảnh](https://x.y/a.png) <script>x</script>';
    const { container } = render(<InlineMarkdown text={payload} />);

    expect(container.querySelector('img, script')).toBeNull();
    expect(container.textContent).toBe(payload);
  });
});
