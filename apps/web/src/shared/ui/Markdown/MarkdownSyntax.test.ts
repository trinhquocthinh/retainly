import { describe, expect, it } from 'vitest';

import { parseInlineMarkdown, stripMarkdown } from './MarkdownSyntax';

const text = (value: string) => ({ kind: 'text', text: value });

describe('E7-S1-T1 — phân tích Markdown tối giản', () => {
  it('nhận đậm, nghiêng và code', () => {
    expect(parseInlineMarkdown('**FSRS** lập lịch *theo* `R`')).toEqual([
      { kind: 'strong', children: [text('FSRS')] },
      text(' lập lịch '),
      { kind: 'em', children: [text('theo')] },
      text(' '),
      { kind: 'code', text: 'R' },
    ]);
  });

  it('giữ nguyên dấu sao đứng cạnh khoảng trắng', () => {
    expect(parseInlineMarkdown('a * b')).toEqual([text('a * b')]);
    expect(parseInlineMarkdown('** không đậm **')).toEqual([text('** không đậm **')]);
  });

  it('giữ nguyên dấu không có cặp đóng hoặc bao quanh chuỗi rỗng', () => {
    expect(parseInlineMarkdown('**chưa đóng')).toEqual([text('**chưa đóng')]);
    expect(parseInlineMarkdown('*chưa đóng')).toEqual([text('*chưa đóng')]);
    expect(parseInlineMarkdown('`chưa đóng')).toEqual([text('`chưa đóng')]);
    expect(parseInlineMarkdown('**** và ``')).toEqual([text('**** và ``')]);
  });

  it('lồng nghiêng trong đậm và ngược lại', () => {
    expect(parseInlineMarkdown('**đậm *nghiêng***')).toEqual([
      { kind: 'strong', children: [text('đậm '), { kind: 'em', children: [text('nghiêng')] }] },
    ]);
    expect(parseInlineMarkdown('*nghiêng **đậm** tiếp*')).toEqual([
      {
        kind: 'em',
        children: [text('nghiêng '), { kind: 'strong', children: [text('đậm')] }, text(' tiếp')],
      },
    ]);
    expect(parseInlineMarkdown('***cả hai***')).toEqual([
      { kind: 'strong', children: [{ kind: 'em', children: [text('cả hai')] }] },
    ]);
  });

  it('nội dung code giữ nguyên văn', () => {
    expect(parseInlineMarkdown('`**x** * y`')).toEqual([{ kind: 'code', text: '**x** * y' }]);
    expect(parseInlineMarkdown('**gọi `a*b` rồi**')).toEqual([
      { kind: 'strong', children: [text('gọi '), { kind: 'code', text: 'a*b' }, text(' rồi')] },
    ]);
  });

  it('dấu gạch chéo ngược thoát ký tự định dạng', () => {
    expect(parseInlineMarkdown('\\*không nghiêng\\* và \\`x\\` \\\\')).toEqual([
      text('*không nghiêng* và `x` \\'),
    ]);
    expect(parseInlineMarkdown('\\n giữ nguyên')).toEqual([text('\\n giữ nguyên')]);
  });

  it('ảnh và HTML chỉ là chữ', () => {
    expect(parseInlineMarkdown('![sơ đồ](https://x.y/a.png) <b>x</b>')).toEqual([
      text('![sơ đồ](https://x.y/a.png) <b>x</b>'),
    ]);
  });

  it('chuỗi rỗng không sinh segment', () => {
    expect(parseInlineMarkdown('')).toEqual([]);
  });
});

describe('E7-S1-T1 — gỡ cú pháp định dạng', () => {
  it('chỉ gỡ đúng phần được hiển thị là định dạng', () => {
    expect(stripMarkdown('**FSRS** dùng *R* và `S`')).toBe('FSRS dùng R và S');
    expect(stripMarkdown('a * b, snake_case, \\*')).toBe('a * b, snake_case, *');
    expect(stripMarkdown('***cả hai***\ndòng hai')).toBe('cả hai\ndòng hai');
  });
});
