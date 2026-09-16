import { extract } from '@extractus/article-extractor';
import { NodeHtmlMarkdown } from 'node-html-markdown';

import { AppError } from '../../../shared/errors';
import type { ArticleExtractor, ExtractedArticle } from '../application/extract-article';
import { normalizeHostname, parseSourceUrl } from '../domain/source-url';
import { createSafeFetcher, type SafeFetcher } from './safe-fetch';

const DEFAULT_TIMEOUT_MS = 8000;

/** Tái sử dụng một instance: khởi tạo bảng luật translator khá tốn cho mỗi lần gọi. */
const markdown = new NodeHtmlMarkdown({ keepDataImages: false });

/**
 * Hiện thực cổng bóc tách (SPEC-001): tải HTML qua fetcher có SSRF Guard,
 * đẩy qua Readability để loại quảng cáo/boilerplate, rồi đổi sang Markdown.
 */

/**
 * Hiện thực cổng bóc tách (SPEC-001): tải HTML qua fetcher có SSRF Guard,
 * đẩy qua Readability để loại quảng cáo/boilerplate, rồi đổi sang Markdown.
 *
 * `fetcher` chỉ để test tích hợp trỏ vào HTTP server giả trên 127.0.0.1 — guard
 * sẽ chặn địa chỉ đó, và nới guard cho môi trường test là cách làm hỏng bảo mật.
 */

export function createArticleExtractor(
  options: { timeoutMs?: number; fetcher?: SafeFetcher } = {},
): ArticleExtractor {
  const fetcher = options.fetcher ?? createSafeFetcher(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  return {
    async extract(rawUrl: string): Promise<ExtractedArticle> {
      const url = parseSourceUrl(rawUrl);

      let article;
      try {
        article = await extract(url.toString(), {}, fetcher);
      } catch (error) {
        // Lỗi ngoài AppError đều là sự cố phía nguồn: HTTP 4xx/5xx, DNS, TLS, parse hỏng.
        throw error instanceof AppError ? error : new AppError('ERR_FETCH_FAILED');
      }

      const cleanText = markdown.translate(article?.content ?? '').trim();
      if (cleanText.length === 0) throw new AppError('ERR_FETCH_FAILED');

      return {
        url: article?.url ?? url.toString(),
        title: article?.title?.trim() || normalizeHostname(url.hostname),
        cleanText,
      };
    },
  };
}
