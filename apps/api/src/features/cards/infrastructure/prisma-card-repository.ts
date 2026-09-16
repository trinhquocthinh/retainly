import { prisma } from '../../../shared/prisma';
import type { CardRepository } from '../application/create-card';

export const prismaCardRepository: CardRepository = {
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
};
