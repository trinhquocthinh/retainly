import { describe, expect, it } from 'vitest';

import { hasCloze, parseInlineMarkdown, stripMarkdown } from './MarkdownSyntax';

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

describe('E7-S1-T3 — TC-059 đoạn đục lỗ `[[...]]`', () => {
  const cloze = (...children: unknown[]) => ({ kind: 'cloze', children });

  it('tách từng đoạn đục lỗ, nội dung bên trong vẫn có định dạng', () => {
    expect(parseInlineMarkdown('[[Paris]] là thủ đô của [[**Pháp**]]')).toEqual([
      cloze(text('Paris')),
      text(' là thủ đô của '),
      cloze({ kind: 'strong', children: [text('Pháp')] }),
    ]);
  });

  it('đoạn đục lỗ nằm trong đậm, và dấu sao bên trong không đóng đậm', () => {
    expect(parseInlineMarkdown('**[[a*b]] đậm**')).toEqual([
      { kind: 'strong', children: [cloze(text('a*b')), text(' đậm')] },
    ]);
  });

  it('rỗng, toàn khoảng trắng, chưa đóng hoặc nằm trong code thì giữ nguyên văn', () => {
    expect(parseInlineMarkdown('[[]] [[  ]] [[chưa đóng [một]')).toEqual([
      text('[[]] [[  ]] [[chưa đóng [một]'),
    ]);
    expect(parseInlineMarkdown('`[[x]]`')).toEqual([{ kind: 'code', text: '[[x]]' }]);
  });

  it('không lồng nhau: đóng ở `]]` đầu tiên', () => {
    expect(parseInlineMarkdown('[[a [[b]] c]]')).toEqual([cloze(text('a [[b')), text(' c]]')]);
  });

  it('hasCloze chỉ đúng khi có đoạn đục lỗ hiển thị được', () => {
    expect(hasCloze('Thủ đô Pháp là [[Paris]]')).toBe(true);
    expect(hasCloze('*nghiêng [[Paris]]*')).toBe(true);
    expect(hasCloze('Không có [[ ]] hay `[[x]]`')).toBe(false);
  });

  it('stripMarkdown trả câu đầy đủ đã điền, bỏ ngoặc', () => {
    expect(stripMarkdown('Thủ đô Pháp là [[**Paris**]]')).toBe('Thủ đô Pháp là Paris');
  });
});
