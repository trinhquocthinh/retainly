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

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '0.0.0.0';

const app = buildApp({ logger: true });

registerHealthRoutes(app, { probe: prismaHealthProbe });
registerCardsRoutes(app, {
  cards: prismaCardRepository,
  sources: prismaSourceOwnership,
  now: () => new Date(),
});
registerReviewRoutes(app, {
  schedules: prismaDueCardQuery,
  reviews: prismaReviewRepository,
  now: () => new Date(),
});
registerSourcesRoutes(app, {
  extractor: createArticleExtractor(),
  sources: prismaSourceRepository,
});

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
