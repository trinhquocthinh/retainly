import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app';
import { DEFAULT_USER_ID } from '../../../shared/default-user';
import { AppError } from '../../../shared/errors';
import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { createArticleExtractor } from '../infrastructure/article-extractor';
import { prismaSourceRepository } from '../infrastructure/prisma-source-repository';
import type { SafeFetcher } from '../infrastructure/safe-fetch';
import { registerSourcesRoutes } from './sources-routes';

const VALID_URL = 'https://example.com/spaced-repetition';

beforeEach(async () => {
  await resetDatabase();

  // Route hiện lấy DEFAULT_USER_ID thay vì TEST_USER_ID. Phải seed đúng user
  // này trước khi repository thật tạo Source, nếu không PostgreSQL chặn FK.
  await testPrisma.user.create({
    data: {
      id: DEFAULT_USER_ID,
      displayName: 'Chủ dự án test',
    },
  });
});

function appWith(fetcher: SafeFetcher) {
  const app = buildApp();

  registerSourcesRoutes(app, {
    extractor: createArticleExtractor({ fetcher }),
    sources: prismaSourceRepository,
  });

  return app;
}

describe('E2-S2-T6 — POST /api/sources xuyên suốt', () => {
  // TC-001
  it('URL hợp lệ trả Markdown sạch và lưu Source thật vào Postgres', async () => {
    const fetcher = vi.fn<SafeFetcher>(
      async () =>
        new Response(
          `<!doctype html>
        <html lang="vi">
          <head><title>Lặp lại ngắt quãng</title></head>
          <body>
            <article>
              <h1>Lặp lại ngắt quãng</h1>
              <p>Kỹ thuật học giúp ghi nhớ lâu dài bằng cách phân bố các lần ôn theo thời gian.</p>
              <p>Thay vì học dồn trong một buổi, người học xem lại kiến thức ngay trước khi quên.</p>
              <p>Khoảng cách giữa các lần ôn tăng dần khi trí nhớ trở nên ổn định hơn.</p>
            </article>
          </body>
        </html>`,
          {
            status: 200,
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          },
        ),
    );

    const app = appWith(fetcher);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: VALID_URL },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      url: VALID_URL,
      title: 'Lặp lại ngắt quãng',
    });

    expect(response.json().sourceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.json().cleanText).toContain('Kỹ thuật học giúp ghi nhớ lâu dài');

    const row = await testPrisma.source.findUniqueOrThrow({
      where: { id: response.json().sourceId },
    });

    expect(row.cleanText).toBe(response.json().cleanText);
    expect(row.userId).toBe(DEFAULT_USER_ID);
    expect(fetcher).toHaveBeenCalledOnce();

    await app.close();
  });

  // TC-002a
  it('nguồn trả HTTP 404 thì phản hồi 502 và không lưu Source', async () => {
    // SafeFetcher production chuyển HTTP >= 400 thành ERR_FETCH_FAILED.
    // Test integration này tiêm lỗi ở đúng ranh giới SafeFetcher để tránh
    // phụ thuộc network nhưng vẫn chạy extractor, use case, route và DB thật.
    const fetcher = vi.fn<SafeFetcher>(async () => {
      throw new AppError('ERR_FETCH_FAILED');
    });

    const app = appWith(fetcher);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: 'https://example.com/404' },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe('ERR_FETCH_FAILED');
    expect(await testPrisma.source.count()).toBe(0);

    await app.close();
  });

  // TC-002b
  it('nguồn bị timeout thì phản hồi 504 và không lưu Source', async () => {
    const fetcher = vi.fn<SafeFetcher>(async () => {
      throw new AppError('ERR_FETCH_TIMEOUT');
    });

    const app = appWith(fetcher);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: 'https://example.com/cham' },
    });

    expect(response.statusCode).toBe(504);
    expect(response.json().error.code).toBe('ERR_FETCH_TIMEOUT');
    expect(await testPrisma.source.count()).toBe(0);

    await app.close();
  });

  // TC-003
  it('URL sai cú pháp bị chặn trước network và không lưu Source', async () => {
    const fetcher = vi.fn<SafeFetcher>();
    const app = appWith(fetcher);

    const response = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: 'khong-phai-url' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('ERR_INVALID_URL');

    // Assertion quan trọng nhất của TC-003: URL bị chặn trước I/O.
    expect(fetcher).not.toHaveBeenCalled();
    expect(await testPrisma.source.count()).toBe(0);

    await app.close();
  });
});
