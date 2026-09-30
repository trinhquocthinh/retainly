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

describe('createArticleExtractor', () => {
  it('giữ thân bài nằm trong thẻ <main> thay vì gọt mất cả cây', async () => {
    const extractor = createArticleExtractor({
      fetcher: async () =>
        new Response(htmlWithMain, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
    });

    const article = await extractor.extract('https://vnexpress.net/bai-viet-1.html');

    expect(article.cleanText).toContain('Mưa lớn đúng giờ tan tầm');
  });
});
