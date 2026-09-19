import type { FastifyInstance } from 'fastify';

import { getCurrentStreak, type StreakQuery } from '../application/get-current-streak';
import { listDueCards, type DueCardQuery } from '../application/list-due-cards';
import { recordOutcome, type ReviewRepository } from '../application/record-outcome';
import { parseOutcome } from '../domain/review-scheduler';
import { requireAuth } from '../../../shared/request-auth';

type OutcomeBody = { cardId: string; outcome: string };

export function registerReviewRoutes(
  app: FastifyInstance,
  deps: {
    schedules: DueCardQuery;
    reviews: ReviewRepository;
    streaks: StreakQuery;
    now: () => Date;
  },
): void {
  app.get('/api/cards/due', async (request) =>
    listDueCards(deps, { userId: requireAuth(request).userId }),
  );

  app.post<{ Body: OutcomeBody }>(
    '/api/review-outcomes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['cardId', 'outcome'],
          properties: {
            // Cột card_id là UUID: chuỗi sai dạng xuống tới Postgres thành 500.
            cardId: { type: 'string', format: 'uuid' },
            outcome: { type: 'string' },
          },
        },
      },
    },
    async (request) =>
      recordOutcome(deps, {
        userId: requireAuth(request).userId,
        cardId: request.body.cardId,
        outcome: parseOutcome(request.body.outcome),
      }),
  );

  app.get('/api/streak', async (request) =>
    getCurrentStreak(deps, { userId: requireAuth(request).userId }),
  );
}
