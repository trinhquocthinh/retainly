import { describe, expect, it } from 'vitest';

import { toParagraphs } from './articleText';

describe('E2-S2-T5 — cắt đoạn văn bản nguồn', () => {
  it('tách theo dòng trống và bỏ khoảng trắng thừa', () => {
    expect(toParagraphs('Đoạn một.\n\n  Đoạn hai.  \n\n\nĐoạn ba.')).toEqual([
      'Đoạn một.',
      'Đoạn hai.',
      'Đoạn ba.',
    ]);
  });

  it('gỡ dấu thăng của tiêu đề Markdown', () => {
    expect(toParagraphs('## Tiêu đề\n\nNội dung.')).toEqual(['Tiêu đề', 'Nội dung.']);
  });

  it('đổi link Markdown thành chữ, bỏ hẳn ảnh', () => {
    expect(
      toParagraphs('Theo [hệ thống Leitner](https://vi.wikipedia.org/wiki/Leitner), thẻ sai lùi.'),
    ).toEqual(['Theo hệ thống Leitner, thẻ sai lùi.']);

    expect(toParagraphs('![Sơ đồ Leitner](https://example.com/so-do.png)')).toEqual([]);
  });

  it('bỏ đường dẫn trần còn sót trong ngoặc đơn', () => {
    expect(toParagraphs('(https://en.wikipedia.org/wiki/Spaced_repetition#cite_note-1)')).toEqual(
      [],
    );
  });

  it('trả lại dấu ngoặc bị escape', () => {
    expect(toParagraphs('Tăng tốc độ học.\\[1\\]')).toEqual(['Tăng tốc độ học.[1]']);
  });

  it('gỡ dấu in đậm và in nghiêng', () => {
    expect(toParagraphs('**Lặp lại ngắt quãng** là _kỹ thuật_ học.')).toEqual([
      'Lặp lại ngắt quãng là kỹ thuật học.',
    ]);
  });

  it('văn bản rỗng trả về mảng rỗng', () => {
    expect(toParagraphs('\n\n   \n\n')).toEqual([]);
  });
});
