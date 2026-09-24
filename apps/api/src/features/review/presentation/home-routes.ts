import type { FastifyInstance } from 'fastify';

import type { StreakQuery } from '../application/get-current-streak';
import { getHomeOverview, type HomeOverviewQuery } from '../application/get-home-overview';
import { requireAuth } from '../../../shared/request-auth';

export function registerHomeRoutes(
  app: FastifyInstance,
  deps: { overview: HomeOverviewQuery; streaks: StreakQuery; now: () => Date },
): void {
  app.get('/api/home/overview', async (request) =>
    getHomeOverview(deps, { userId: requireAuth(request).userId }),
  );
}
