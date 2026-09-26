/**
 * Ký hiệu định dạng của nội dung thẻ: `**đậm**`, `*nghiêng*`, `` `code` `` và
 * đục lỗ `[[...]]`. Viết ở dạng regex POSIX để SQL (`regexp_replace`) và JS
 * dùng chung một nguồn — tìm kiếm so khớp trên phần chữ đã gỡ các ký hiệu này.
 */
export const MARKUP_PATTERN = '\\*|`|\\[\\[|\\]\\]';

const MARKUP = new RegExp(MARKUP_PATTERN, 'g');

/** Từ khoá tìm kiếm Thư viện: gỡ ký hiệu định dạng, cắt khoảng trắng; rỗng thì không lọc. */
export function searchKeyword(raw: string | undefined): string | undefined {
  const keyword = raw?.replace(MARKUP, '').trim();
  return keyword ? keyword : undefined;
}
