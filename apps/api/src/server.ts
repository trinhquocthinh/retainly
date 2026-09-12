import { buildApp } from './app';
import { prismaCardRepository } from './features/cards/infrastructure/prisma-card-repository';
import { registerCardsRoutes } from './features/cards/presentation/cards-routes';
import { prismaDueCardQuery } from './features/review/infrastructure/prisma-due-card-query';
import { registerReviewRoutes } from './features/review/presentation/review-routes';

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '0.0.0.0';

const app = buildApp({ logger: true });

registerCardsRoutes(app, { cards: prismaCardRepository, now: () => new Date() });
registerReviewRoutes(app, { schedules: prismaDueCardQuery, now: () => new Date() });

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
