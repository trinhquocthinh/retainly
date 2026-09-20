import { buildApp } from './app';
import { prismaCardRepository } from './features/cards/infrastructure/prisma-card-repository';
import { registerCardsRoutes } from './features/cards/presentation/cards-routes';
import { prismaDueCardQuery } from './features/review/infrastructure/prisma-due-card-query';
import { prismaReviewRepository } from './features/review/infrastructure/prisma-review-repository';
import { registerReviewRoutes } from './features/review/presentation/review-routes';
import { createArticleExtractor } from './features/sources/infrastructure/article-extractor';
import { prismaSourceOwnership } from './features/cards/infrastructure/prisma-source-ownership';
import { prismaSourceRepository } from './features/sources/infrastructure/prisma-source-repository';
import { registerSourcesRoutes } from './features/sources/presentation/sources-routes';
import { registerHealthRoutes } from './shared/health-routes';
import { prismaHealthProbe } from './shared/prisma-health-probe';
import { prismaCardListQuery } from './features/cards/infrastructure/prisma-card-list-query';
import { readAuthConfig } from './features/auth/infrastructure/auth-config';
import { createOpenIdSsoClient } from './features/auth/infrastructure/openid-sso-client';
import {
  prismaLocalUserRepository,
  prismaSessionRepository,
  prismaSsoUserRepository,
  prismaUserCounter,
} from './features/auth/infrastructure/prisma-auth-repositories';
import { registerAuthRoutes } from './features/auth/presentation/auth-routes';
import { argon2PasswordHasher } from './features/auth/infrastructure/argon2-password-hasher';
import { prismaStreakQuery } from './features/review/infrastructure/prisma-streak-query';
import {
  prismaCardTopicRepository,
  prismaTopicRepository,
} from './features/topics/infrastructure/prisma-topic-repository';
import { registerTopicsRoutes } from './features/topics/presentation/topics-routes';

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '0.0.0.0';

const auth = readAuthConfig(process.env);
const app = buildApp({ logger: true });

registerAuthRoutes(app, {
  sso: createOpenIdSsoClient(auth.oidc),
  users: prismaSsoUserRepository,
  localUsers: prismaLocalUserRepository,
  hasher: argon2PasswordHasher,
  sessions: prismaSessionRepository,
  userCounter: prismaUserCounter,
  now: () => new Date(),
  appOrigin: auth.appOrigin,
  cookieSecret: auth.cookieSecret,
});

registerHealthRoutes(app, { probe: prismaHealthProbe });
registerCardsRoutes(app, {
  cards: prismaCardRepository,
  cardList: prismaCardListQuery,
  sources: prismaSourceOwnership,
  topics: prismaTopicRepository,
  now: () => new Date(),
});
registerReviewRoutes(app, {
  schedules: prismaDueCardQuery,
  reviews: prismaReviewRepository,
  streaks: prismaStreakQuery,
  now: () => new Date(),
});
registerTopicsRoutes(app, {
  topics: prismaTopicRepository,
  cards: prismaCardTopicRepository,
});
registerSourcesRoutes(app, {
  extractor: createArticleExtractor(),
  sources: prismaSourceRepository,
});

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
