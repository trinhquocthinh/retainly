import { prisma } from '../../../shared/prisma';
import type { CardRepository } from '../application/create-card';
import type { CardDeleteRepository } from '../application/delete-card';
import type { CardUpdateRepository } from '../application/update-card';

type PrismaCardRepository = CardRepository & CardUpdateRepository & CardDeleteRepository;

export const prismaCardRepository: PrismaCardRepository = {
  async create(card) {
    const row = await prisma.card.create({
      data: {
        userId: card.userId,
        sourceId: card.sourceId,
        front: card.front,
        back: card.back,
        schedule: {
          create: {
            state: card.schedule.state,
            dueDate: card.schedule.dueDate,
            intervalDays: card.schedule.intervalDays,
            stability: card.schedule.stability,
            difficulty: card.schedule.difficulty,
            elapsedDays: card.schedule.elapsedDays,
            scheduledDays: card.schedule.scheduledDays,
            reps: card.schedule.reps,
            lapses: card.schedule.lapses,
            lastReviewedAt: card.schedule.lastReviewedAt,
          },
        },
      },
      include: { schedule: true },
    });

    return { ...card, id: row.id, createdAt: row.createdAt };
  },

  async updateOwned({ userId, cardId, content }) {
    const rows = await prisma.card.updateManyAndReturn({
      where: {
        id: cardId,
        userId,
      },
      data: content,
      select: {
        id: true,
        sourceId: true,
        front: true,
        back: true,
        createdAt: true,
      },
    });

    return rows[0] ?? null;
  },

  async deleteOwned({ userId, cardId }) {
    const result = await prisma.card.deleteMany({
      where: {
        id: cardId,
        userId,
      },
    });

    return result.count === 1;
  },
};
