import type { FastifyInstance } from 'fastify';

import { createCard, type CardRepository, type SourceOwnership } from '../application/create-card';
import { DEFAULT_USER_ID } from '../../../shared/default-user';

type Body = { sourceId?: string; front: string; back: string };

export function registerCardsRoutes(
  app: FastifyInstance,
  deps: { cards: CardRepository; sources: SourceOwnership; now: () => Date },
): void {
  app.post<{ Body: Body }>(
    '/api/cards',
    {
      schema: {
        body: {
          type: 'object',
          required: ['front', 'back'],
          properties: {
            // format uuid chặn ngay ở tầng schema: cột source_id là UUID, chuỗi
            // sai dạng mà xuống tới Postgres sẽ thành lỗi 500 thay vì 400.
            sourceId: { type: 'string', format: 'uuid' },
            front: { type: 'string', maxLength: 2000 },
            back: { type: 'string', maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const card = await createCard(deps, { userId: DEFAULT_USER_ID, ...request.body });
      return reply.status(201).send(card);
    },
  );
}
