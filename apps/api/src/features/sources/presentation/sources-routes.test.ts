import { describe, expect, it } from 'vitest';

import { buildApp } from '../../../app';
import { AppError } from '../../../shared/errors';
import type { SourceRepository } from '../application/create-source';
import type { ArticleExtractor } from '../application/extract-article';
import { registerSourcesRoutes } from './sources-routes';
import { signInAs } from '../../../shared/test/sign-in-as';

const NOW = new Date('2026-06-15T09:00:00Z');

let saveCount = 0;

const fakeSources: SourceRepository = {
  async create(source) {
    saveCount += 1;
    return { id: 'source-1', createdAt: NOW, ...source };
  },
};

function appWith(extractor: ArticleExtractor) {
  saveCount = 0;
  const app = buildApp();
  signInAs(app);
  registerSourcesRoutes(app, { extractor, sources: fakeSources });
  return app;
}

const failingWith = (code: 'ERR_INVALID_URL' | 'ERR_FETCH_FAILED' | 'ERR_FETCH_TIMEOUT') =>
  ({
    extract: async () => {
      throw new AppError(code);
    },
  }) satisfies ArticleExtractor;

describe('E2-S1-T3 — POST /api/sources', () => {
  it('trả 201 kèm sourceId và cleanText Markdown', async () => {
    const app = appWith({
      extract: async () => ({
        url: 'https://example.com/bai-viet',
        title: 'Bài viết mẫu',
        cleanText: '## Tiêu đề\n\nNội dung sạch.',
      }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: 'https://example.com/bai-viet' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      sourceId: 'source-1',
      url: 'https://example.com/bai-viet',
      title: 'Bài viết mẫu',
      cleanText: '## Tiêu đề\n\nNội dung sạch.',
    });
    await app.close();
  });

  // TC-003
  it('URL sai cú pháp trả 400 ERR_INVALID_URL và không lưu Source', async () => {
    const app = appWith(failingWith('ERR_INVALID_URL'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: 'khong-phai-url' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_INVALID_URL');
    expect(saveCount).toBe(0);
    await app.close();
  });

  // TC-002
  it('nguồn không tải được trả 502 ERR_FETCH_FAILED và không lưu Source', async () => {
    const app = appWith(failingWith('ERR_FETCH_FAILED'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: 'https://example.com/404' },
    });

    expect(res.statusCode).toBe(502);
    expect(res.json().error.code).toBe('ERR_FETCH_FAILED');
    expect(saveCount).toBe(0);
    await app.close();
  });

  it('nguồn phản hồi quá lâu trả 504 ERR_FETCH_TIMEOUT', async () => {
    const app = appWith(failingWith('ERR_FETCH_TIMEOUT'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { url: 'https://example.com/cham' },
    });

    expect(res.statusCode).toBe(504);
    expect(res.json().error.code).toBe('ERR_FETCH_TIMEOUT');
    expect(saveCount).toBe(0);
    await app.close();
  });

  it('thiếu trường url trả 400 ERR_BAD_REQUEST', async () => {
    const app = appWith(failingWith('ERR_FETCH_FAILED'));

    const res = await app.inject({ method: 'POST', url: '/api/sources', payload: {} });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ERR_BAD_REQUEST');
    await app.close();
  });
});
