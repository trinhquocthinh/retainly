import type { FastifyInstance } from 'fastify';

import type { StreakQuery } from '../application/get-current-streak';
import { getStats, type StatsQuery } from '../application/get-stats';
import { STATS_RANGES, type StatsRange } from '../domain/stats';
import { requireAuth } from '../../../shared/request-auth';

type StatsQuerystring = { range: StatsRange };

export function registerStatsRoutes(
  app: FastifyInstance,
  deps: { stats: StatsQuery; streaks: StreakQuery; now: () => Date },
): void {
  app.get<{ Querystring: StatsQuerystring }>(
    '/api/stats',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            range: { type: 'string', enum: [...STATS_RANGES], default: '30d' },
          },
        },
      },
    },
    async (request) =>
      getStats(deps, { userId: requireAuth(request).userId, range: request.query.range }),
  );
}
