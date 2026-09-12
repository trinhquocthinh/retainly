import type { FastifyInstance } from 'fastify';

import { listDueCards, type DueCardQuery } from '../application/list-due-cards';
import { DEFAULT_USER_ID } from '../../../shared/default-user';

export function registerReviewRoutes(
  app: FastifyInstance,
  deps: { schedules: DueCardQuery; now: () => Date },
): void {
  app.get('/api/cards/due', async () => listDueCards(deps, { userId: DEFAULT_USER_ID }));
}
