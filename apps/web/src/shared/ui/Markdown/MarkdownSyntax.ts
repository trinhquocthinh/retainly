/**
 * Markdown tối giản cho nội dung thẻ (US-011): chỉ `**đậm**`, `*nghiêng*`, `` `code` ``.
 * Kết quả là cây segment thuần dữ liệu — lớp hiển thị tự dựng phần tử React từ đó,
 * nên không có đường nào đưa HTML của người dùng vào DOM.
 */
export type InlineSegment =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong' | 'em'; children: InlineSegment[] };

type Emphasis = { kind: 'strong' | 'em'; size: 1 | 2 };

const ESCAPABLE = new Set(['\\', '*', '`']);

const isBlank = (char: string | undefined) => char === undefined || /\s/.test(char);

function starRunLength(text: string, from: number): number {
  let end = from;
  while (text[end] === '*') end += 1;
  return end - from;
}

/** Vị trí dấu đóng của code span mở tại `from`, hoặc -1 nếu không có hay rỗng. */
function codeCloser(text: string, from: number): number {
  const closer = text.indexOf('`', from + 1);
  return closer > from + 1 ? closer : -1;
}

/**
 * Tìm dấu đóng cho `*`/`**` mở tại `contentStart - size`. Dấu đóng phải nằm sau
 * một ký tự không trắng; bỏ qua ký tự escape và code span. Chuỗi `***` đóng được
 * cả hai lớp nên dấu đóng được tính từ cuối chuỗi sao.
 */
function emphasisCloser(text: string, contentStart: number, size: 1 | 2): number {
  let index = contentStart;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\' && ESCAPABLE.has(text[index + 1])) {
      index += 2;
    } else if (char === '`') {
      const closer = codeCloser(text, index);
      index = closer === -1 ? index + 1 : closer + 1;
    } else if (char === '*') {
      const run = starRunLength(text, index);
      const closer = index + run - size;
      const matches = run === size || run === 3;
      if (matches && closer > contentStart && !isBlank(text[index - 1])) return closer;
      index += run;
    } else {
      index += 1;
    }
  }
  return -1;
}

function openingEmphasis(text: string, index: number): Emphasis | null {
  if (text[index] !== '*') return null;
  if (text[index + 1] === '*') {
    return isBlank(text[index + 2]) ? null : { kind: 'strong', size: 2 };
  }
  return isBlank(text[index + 1]) ? null : { kind: 'em', size: 1 };
}

export function parseInlineMarkdown(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer.length > 0) segments.push({ kind: 'text', text: buffer });
    buffer = '';
  };

  let index = 0;
  while (index < text.length) {
    const char = text[index];

    if (char === '\\' && ESCAPABLE.has(text[index + 1])) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }

    if (char === '`') {
      const closer = codeCloser(text, index);
      if (closer !== -1) {
        flush();
        segments.push({ kind: 'code', text: text.slice(index + 1, closer) });
        index = closer + 1;
        continue;
      }
    }

    const emphasis = openingEmphasis(text, index);
    if (emphasis) {
      const contentStart = index + emphasis.size;
      const closer = emphasisCloser(text, contentStart, emphasis.size);
      if (closer !== -1) {
        flush();
        segments.push({
          kind: emphasis.kind,
          children: parseInlineMarkdown(text.slice(contentStart, closer)),
        });
        index = closer + emphasis.size;
        continue;
      }
      // Không có dấu đóng: giữ nguyên cả cụm `**` để không bị hiểu lại thành `*`.
      buffer += text.slice(index, contentStart);
      index = contentStart;
      continue;
    }

    buffer += char;
    index += 1;
  }

  flush();
  return segments;
}

function plainText(segments: InlineSegment[]): string {
  return segments
    .map((segment) => ('children' in segment ? plainText(segment.children) : segment.text))
    .join('');
}

/** Gỡ cú pháp định dạng, giữ đúng phần chữ mà `<InlineMarkdown>` hiển thị. */
export function stripMarkdown(text: string): string {
  return plainText(parseInlineMarkdown(text));
}
