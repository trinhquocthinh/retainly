export type ExtractedArticle = { url: string; title: string; cleanText: string };

/** Cổng bóc tách bài viết. Hiện thực thật nằm ở tầng infrastructure. */
export type ArticleExtractor = {
  extract(url: string): Promise<ExtractedArticle>;
};
