import type { FastifyInstance } from 'fastify';

import { argon2PasswordHasher } from '../../features/auth/infrastructure/argon2-password-hasher';
import {
  prismaLocalUserRepository,
  prismaSessionRepository,
  prismaSsoUserRepository,
  prismaUserCounter,
} from '../../features/auth/infrastructure/prisma-auth-repositories';
import { registerAuthRoutes } from '../../features/auth/presentation/auth-routes';

/**
 * Gắn auth-routes với Postgres + Argon2 thật cho test integration. SSO cố ý
 * không dùng được: test integration không gọi Authentik.
 */
export function registerPrismaAuthRoutes(app: FastifyInstance): void {
  registerAuthRoutes(app, {
    sso: {
      startLogin: () => Promise.reject(new Error('Test này không đi qua SSO')),
      finishLogin: () => Promise.reject(new Error('Test này không đi qua SSO')),
    },
    users: prismaSsoUserRepository,
    localUsers: prismaLocalUserRepository,
    hasher: argon2PasswordHasher,
    sessions: prismaSessionRepository,
    userCounter: prismaUserCounter,
    now: () => new Date(),
    appOrigin: new URL('https://retainly.example.test'),
    cookieSecret: 'bi-mat-test-dai-hon-ba-muoi-hai-ky-tu',
  });
}
