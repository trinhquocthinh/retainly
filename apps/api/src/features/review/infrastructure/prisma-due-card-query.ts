import { prisma } from '../../../shared/prisma';
import type { DueCardQuery } from '../application/list-due-cards';
import { SCHEDULE_COLUMNS } from './prisma-review-repository';

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

  async findExtraCandidates(userId, { dueAfter, notReviewedSince }) {
    const rows = await prisma.reviewSchedule.findMany({
      where: {
        dueDate: { gt: dueAfter },
        // Thẻ mới luôn đến hạn ngay khi tạo; chặn thêm để R = 0 không lọt vào.
        state: { not: 'new' },
        card: { userId, outcomes: { none: { reviewedAt: { gte: notReviewedSince } } } },
      },
      select: {
        ...SCHEDULE_COLUMNS,
        card: { select: { id: true, front: true, back: true, note: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { cardId: 'asc' }],
    });

    return rows.map(({ card, ...schedule }) => ({
      card: { ...card, dueDate: schedule.dueDate },
      schedule,
    }));
  },
};
