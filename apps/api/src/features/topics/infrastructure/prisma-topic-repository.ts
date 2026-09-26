import { Prisma } from '../../../generated/prisma/client';
import { prisma } from '../../../shared/prisma';
import type { CardTopicRepository } from '../application/assign-topic-to-card';
import type { TopicRepository } from '../application/create-topic';

export const prismaTopicRepository: TopicRepository = {
  async create(input) {
    try {
      return await prisma.knowledgeTopic.create({
        data: input,
        select: { id: true, name: true, createdAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  },

  async listByUser(userId) {
    return prisma.knowledgeTopic.findMany({
      where: { userId },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, createdAt: true },
    });
  },

  async belongsToUser({ userId, topicId }) {
    const topic = await prisma.knowledgeTopic.findFirst({
      where: { id: topicId, userId },
      select: { id: true },
    });
    return topic !== null;
  },
};

export const prismaCardTopicRepository: CardTopicRepository = {
  async assignOwned({ userId, cardId, topicId }) {
    const rows = await prisma.card.updateManyAndReturn({
      where: { id: cardId, userId },
      data: { topicId },
      select: {
        id: true,
        sourceId: true,
        topicId: true,
        front: true,
        back: true,
        createdAt: true,
      },
    });

    return rows[0] ?? null;
  },
};
