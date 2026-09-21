import { prisma } from '../../../shared/prisma';
import type { DueCardQuery } from '../application/list-due-cards';

export const prismaDueCardQuery: DueCardQuery = {
  async findDueBy(userId, cutoff) {
    const rows = await prisma.reviewSchedule.findMany({
      where: { dueDate: { lte: cutoff }, card: { userId } },
      include: { card: true },
      orderBy: { dueDate: 'asc' },
    });

    return rows.map((row) => ({
      id: row.card.id,
      front: row.card.front,
      back: row.card.back,
      note: row.card.note,
      dueDate: row.dueDate,
    }));
  },
};
