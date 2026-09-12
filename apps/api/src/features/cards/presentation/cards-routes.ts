import type { FastifyInstance } from 'fastify';

import { createCard, type CardRepository } from '../application/create-card';
import { DEFAULT_USER_ID } from '../../../shared/default-user';

type Body = { front: string; back: string };

export function registerCardsRoutes(
  app: FastifyInstance,
  deps: { cards: CardRepository; now: () => Date },
): void {
  app.post<{ Body: Body }>(
    '/api/cards',
    {
      schema: {
        body: {
          type: 'object',
          required: ['front', 'back'],
          properties: {
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
