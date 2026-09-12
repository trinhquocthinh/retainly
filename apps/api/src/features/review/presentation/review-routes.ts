import type { FastifyInstance } from 'fastify';

import { listDueCards, type DueCardQuery } from '../application/list-due-cards';
import { recordOutcome, type ReviewRepository } from '../application/record-outcome';
import { parseOutcome } from '../domain/review-scheduler';
import { DEFAULT_USER_ID } from '../../../shared/default-user';

type OutcomeBody = { cardId: string; outcome: string };

export function registerReviewRoutes(
  app: FastifyInstance,
  deps: { schedules: DueCardQuery; reviews: ReviewRepository; now: () => Date },
): void {
  app.get('/api/cards/due', async () => listDueCards(deps, { userId: DEFAULT_USER_ID }));

  app.post<{ Body: OutcomeBody }>(
    '/api/review-outcomes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['cardId', 'outcome'],
          properties: { cardId: { type: 'string' }, outcome: { type: 'string' } },
        },
      },
    },
    async (request) =>
      recordOutcome(deps, {
        userId: DEFAULT_USER_ID,
        cardId: request.body.cardId,
        outcome: parseOutcome(request.body.outcome),
      }),
  );
}
