import type { FastifyInstance } from 'fastify';

import { createSource, type SourceRepository } from '../application/create-source';
import type { ArticleExtractor } from '../application/extract-article';
import { requireAuth } from '../../../shared/request-auth';

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
          additionalProperties: false,
          properties: { url: { type: 'string', maxLength: 2048 } },
        },
      },
    },
    async (request, reply) => {
      const source = await createSource(deps, {
        userId: requireAuth(request).userId,
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
