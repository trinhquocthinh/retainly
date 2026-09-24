import type { FastifyInstance } from 'fastify';

import { getCurrentStreak, type StreakQuery } from '../application/get-current-streak';
import { listDueCards, type DueCardQuery } from '../application/list-due-cards';
import { listExtraCards } from '../application/list-extra-cards';
import { recordOutcome } from '../application/record-outcome';
import type { ReviewRepository } from '../application/review-repository';
import { undoOutcome } from '../application/undo-outcome';
import { parseOutcome } from '../domain/review-scheduler';
import { requireAuth } from '../../../shared/request-auth';

type OutcomeBody = { cardId: string; outcome: string };
type OutcomeParams = { id: string };
type DueQuerystring = { topicId?: string };

export function registerReviewRoutes(
  app: FastifyInstance,
  deps: {
    schedules: DueCardQuery;
    reviews: ReviewRepository;
    streaks: StreakQuery;
    now: () => Date;
  },
): void {
  app.get<{ Querystring: DueQuerystring }>(
    '/api/cards/due',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            // Cột topic_id là UUID: chuỗi sai dạng xuống tới Postgres thành 500.
            topicId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request) =>
      listDueCards(deps, {
        userId: requireAuth(request).userId,
        topicId: request.query.topicId,
      }),
  );

  app.get('/api/cards/extra', async (request) =>
    listExtraCards(deps, { userId: requireAuth(request).userId }),
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

  app.delete<{ Params: OutcomeParams }>(
    '/api/review-outcomes/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: {
            // Cột id là UUID: chuỗi sai dạng xuống tới Postgres thành 500.
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request) =>
      undoOutcome(deps, {
        userId: requireAuth(request).userId,
        outcomeId: request.params.id,
      }),
  );
}
