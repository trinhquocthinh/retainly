import type { ArticleExtractor } from './extract-article';

type NewSource = { userId: string; url: string; title: string; cleanText: string };
export type CreatedSource = NewSource & { id: string; createdAt: Date };

/** Cổng lưu trữ nguồn. Hiện thực thật nằm ở tầng infrastructure. */
export type SourceRepository = {
  create(source: NewSource): Promise<CreatedSource>;
};

/**
 * Bóc tách rồi lưu nguồn (SPEC-001).
 * Thứ tự là bắt buộc: extractor ném lỗi thì không có bản ghi Source nào được
 * tạo — đúng yêu cầu "không tạo bản ghi" của TC-002.
 */
export async function createSource(
  deps: { extractor: ArticleExtractor; sources: SourceRepository },
  input: { userId: string; url: string },
): Promise<CreatedSource> {
  const article = await deps.extractor.extract(input.url);

  return deps.sources.create({
    userId: input.userId,
    url: article.url,
    title: article.title,
    cleanText: article.cleanText,
  });
}
