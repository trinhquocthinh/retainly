import type { ReviewScheduleWhereInput } from '../../../generated/prisma/models';
import { prisma } from '../../../shared/prisma';
import type { DueCardQuery, ScheduledCard } from '../application/list-due-cards';
import { SCHEDULE_COLUMNS } from './prisma-review-repository';

/** Hai hàng đợi chỉ khác điều kiện lọc: cùng cột, cùng thứ tự hạn rồi id. */
async function findQueue(where: ReviewScheduleWhereInput): Promise<ScheduledCard[]> {
  const rows = await prisma.reviewSchedule.findMany({
    where,
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
}

export const prismaDueCardQuery: DueCardQuery = {
  findDueBy(userId, cutoff, topicId) {
    // topicId undefined thì Prisma bỏ qua điều kiện, trả cả hàng đợi.
    return findQueue({ dueDate: { lte: cutoff }, card: { userId, topicId } });
  },

  findExtraCandidates(userId, { dueAfter, notReviewedSince }) {
    return findQueue({
      dueDate: { gt: dueAfter },
      // Thẻ mới luôn đến hạn ngay khi tạo; chặn thêm để R = 0 không lọt vào.
      state: { not: 'new' },
      card: { userId, outcomes: { none: { reviewedAt: { gte: notReviewedSince } } } },
    });
  },
};
