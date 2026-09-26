import { describe, expect, it } from 'vitest';

import { applyCardFormat } from './cardFormatting';

describe('E7-S1-T4 — applyCardFormat', () => {
  it('bọc đoạn đang chọn và giữ vùng chọn quanh nội dung', () => {
    const result = applyCardFormat({ value: 'Thủ đô Pháp là Paris', start: 15, end: 20 }, 'bold');

    expect(result.value).toBe('Thủ đô Pháp là **Paris**');
    expect(result.value.slice(result.start, result.end)).toBe('Paris');
  });

  it.each([
    ['italic', '*Paris*'],
    ['code', '`Paris`'],
    ['cloze', '[[Paris]]'],
  ] as const)('%s dùng đúng cú pháp của MarkdownSyntax', (format, expected) => {
    expect(applyCardFormat({ value: 'Paris', start: 0, end: 5 }, format).value).toBe(expected);
  });

  it('khoảng trắng hai đầu vùng chọn nằm ngoài dấu', () => {
    const result = applyCardFormat({ value: 'là Paris nhé', start: 2, end: 9 }, 'bold');

    expect(result.value).toBe('là **Paris** nhé');
    expect(result.value.slice(result.start, result.end)).toBe('Paris');
  });

  it('chưa chọn gì thì chèn chữ mẫu tại con trỏ và chọn sẵn chữ mẫu', () => {
    const result = applyCardFormat({ value: 'Thủ đô Pháp là ', start: 15, end: 15 }, 'cloze');

    expect(result.value).toBe('Thủ đô Pháp là [[đáp án]]');
    expect(result.value.slice(result.start, result.end)).toBe('đáp án');
  });

  it('vùng chọn toàn khoảng trắng coi như chưa chọn, không nuốt khoảng trắng', () => {
    const result = applyCardFormat({ value: 'a  b', start: 1, end: 3 }, 'italic');

    expect(result.value).toBe('a  *chữ nghiêng*b');
  });
});
