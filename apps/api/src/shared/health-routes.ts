import type { FastifyInstance } from 'fastify';

export type HealthProbe = () => Promise<void>;

export function registerHealthRoutes(app: FastifyInstance, deps: { probe: HealthProbe }): void {
  app.get('/api/health', async (request, reply) => {
    try {
      await deps.probe();
    } catch (error) {
      request.log.error({ err: error }, 'Health check: không kết nối được database');
      return reply.status(503).send({ status: 'degraded', database: 'down' });
    }

    return { status: 'ok', database: 'up' };
  });
}
