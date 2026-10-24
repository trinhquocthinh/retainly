import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../shared/request-auth';
import { parseOutcome } from '../domain/review-scheduler';
import type { PracticeSize } from '../domain/practice-selection';
import type { PracticeRepository } from '../application/practice-repository';
import {
  beginPractice,
  getPractice,
  ratePractice,
  undoPractice,
} from '../application/practice-session';

const params = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
} as const;

export function registerPracticeRoutes(
  app: FastifyInstance,
  deps: { practices: PracticeRepository; now: () => Date },
) {
  app.get('/api/practice-sessions/overview', async (request) =>
    deps.practices.overview(requireAuth(request).userId, deps.now()),
  );

  app.post<{ Body: { size: PracticeSize; topicId?: string } }>(
    '/api/practice-sessions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['size'],
          additionalProperties: false,
          properties: {
            size: { type: 'integer', enum: [10, 15] },
            topicId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request) => ({
      session: await beginPractice(deps, { ...request.body, userId: requireAuth(request).userId }),
    }),
  );

  app.get<{ Params: { id: string } }>(
    '/api/practice-sessions/:id',
    { schema: { params } },
    async (request) => ({
      session: await getPractice(deps, {
        userId: requireAuth(request).userId,
        sessionId: request.params.id,
      }),
    }),
  );

  app.post<{ Params: { id: string }; Body: { itemId: string; outcome: string } }>(
    '/api/practice-sessions/:id/outcomes',
    {
      schema: {
        params,
        body: {
          type: 'object',
          required: ['itemId', 'outcome'],
          additionalProperties: false,
          properties: { itemId: { type: 'string', format: 'uuid' }, outcome: { type: 'string' } },
        },
      },
    },
    async (request) => ({
      session: await ratePractice(deps, {
        userId: requireAuth(request).userId,
        sessionId: request.params.id,
        itemId: request.body.itemId,
        outcome: parseOutcome(request.body.outcome),
      }),
    }),
  );

  app.post<{ Params: { id: string }; Body: { itemId: string; outcomeId: string } }>(
    '/api/practice-sessions/:id/undo',
    {
      schema: {
        params,
        body: {
          type: 'object',
          required: ['itemId', 'outcomeId'],
          additionalProperties: false,
          properties: {
            itemId: { type: 'string', format: 'uuid' },
            outcomeId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request) => ({
      session: await undoPractice(deps, {
        ...request.body,
        userId: requireAuth(request).userId,
        sessionId: request.params.id,
      }),
    }),
  );
}
