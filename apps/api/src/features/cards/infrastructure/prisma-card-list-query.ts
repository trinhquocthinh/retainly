import { prisma } from '../../../shared/prisma';
import type { CardListQuery } from '../application/list-cards';

export const prismaCardListQuery: CardListQuery = {
  async list(input) {
    const where = {
      userId: input.userId,
      ...(input.sourceId === undefined ? {} : { sourceId: input.sourceId }),
    };

    return prisma.$transaction(
      async (tx) => {
        const [totalItems, items] = await Promise.all([
          tx.card.count({ where }),
          tx.card.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (input.page - 1) * input.pageSize,
            take: input.pageSize,
            select: {
              id: true,
              sourceId: true,
              front: true,
              back: true,
              createdAt: true,
            },
          }),
        ]);

        return {
          items,
          totalItems,
        };
      },
      {
        isolationLevel: 'RepeatableRead',
      },
    );
  },
};
