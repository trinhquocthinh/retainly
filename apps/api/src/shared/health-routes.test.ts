import { describe, it, expect } from 'vitest';

import { buildApp } from '../app';
import { registerHealthRoutes } from './health-routes';

describe('Health check', () => {
  it('trả 200 khi database trả lời', async () => {
    const app = buildApp();
    registerHealthRoutes(app, { probe: async () => {} });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', database: 'up' });
    await app.close();
  });

  it('trả 503 khi database không trả lời', async () => {
    const app = buildApp();
    registerHealthRoutes(app, {
      probe: async () => {
        throw new Error('connection refused');
      },
    });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'degraded', database: 'down' });
    await app.close();
  });
});
