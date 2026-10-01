import { describe, expect, it } from 'vitest';

import { createArticleExtractor } from './article-extractor';

const paragraph =
  'Mưa lớn đúng giờ tan tầm khiến nhiều tuyến đường quanh cửa ngõ sân bay ùn tắc kéo dài, ' +
  'hàng nghìn phương tiện nhích từng chút trong làn nước ngập tới bánh xe. ';

/** Mô phỏng layout VnExpress: thân bài nằm trong `<main>`, thẻ không có trong allowlist mặc định. */
const htmlWithMain = `<!doctype html>
<html lang="vi">
  <head><title>Mưa như trút giờ tan tầm</title></head>
  <body>
    <div>
      <main>
        <h1>Mưa như trút giờ tan tầm</h1>
        <article>
          <p>${paragraph.repeat(4)}</p>
          <p>${paragraph.repeat(4)}</p>
        </article>
      </main>
    </div>
  </body>
</html>`;

/**
 * Mô phỏng Cổng DVC Bộ Công an: mỗi mục accordion nhúng nguyên một cặp
 * `<html><body>` mà linkedom dựng thành phần tử lồng nhau thay vì bỏ qua.
 */
const htmlWithNestedDocument = `<!doctype html>
<html lang="vi">
  <head><title>Cấp đổi thẻ căn cước</title></head>
  <body>
    <div>
      <h1>Cấp đổi thẻ căn cước</h1>
      <div class="tthc-list-item-detail">
        <html><body>
          <p>Bước 1: ${paragraph.repeat(4)}</p>
          <p>Bước 2: ${paragraph.repeat(4)}</p>
        </body></html>
      </div>
    </div>
  </body>
</html>`;

function extractorFor(html: string) {
  return createArticleExtractor({
    fetcher: async () =>
      new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
  });
}

describe('createArticleExtractor', () => {
  it('giữ thân bài nằm trong thẻ <main> thay vì gọt mất cả cây', async () => {
    const article = await extractorFor(htmlWithMain).extract(
      'https://vnexpress.net/bai-viet-1.html',
    );

    expect(article.cleanText).toContain('Mưa lớn đúng giờ tan tầm');
  });

  it('giữ nội dung nằm trong cặp <html><body> nhúng lồng giữa trang', async () => {
    const article = await extractorFor(htmlWithNestedDocument).extract(
      'https://dichvucong.bocongan.gov.vn/bocongan/bothutuc/tthc?matt=26094',
    );

    expect(article.cleanText).toContain('Bước 1:');
    expect(article.cleanText).toContain('Bước 2:');
    expect(article.cleanText).not.toMatch(/<\/?(html|body)/i);
  });
});
