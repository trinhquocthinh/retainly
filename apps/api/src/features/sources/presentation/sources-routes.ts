import type { FastifyInstance } from 'fastify';

import { createSource, type SourceRepository } from '../application/create-source';
import type { ArticleExtractor } from '../application/extract-article';
import { DEFAULT_USER_ID } from '../../../shared/default-user';

type Body = { url: string };

export function registerSourcesRoutes(
  app: FastifyInstance,
  deps: { extractor: ArticleExtractor; sources: SourceRepository },
): void {
  app.post<{ Body: Body }>(
    '/api/sources',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url'],
          properties: { url: { type: 'string', maxLength: 2048 } },
        },
      },
    },
    async (request, reply) => {
      const source = await createSource(deps, {
        userId: DEFAULT_USER_ID,
        url: request.body.url,
      });

      return reply.status(201).send({
        sourceId: source.id,
        url: source.url,
        title: source.title,
        cleanText: source.cleanText,
        createdAt: source.createdAt,
      });
    },
  );
}
