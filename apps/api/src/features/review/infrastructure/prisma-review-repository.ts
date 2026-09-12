import { prisma } from '../../../shared/prisma';
import type { ReviewRepository } from '../application/record-outcome';

export const prismaReviewRepository: ReviewRepository = {
  async findScheduleFor(userId, cardId) {
    const row = await prisma.reviewSchedule.findFirst({
      where: { cardId, card: { userId } },
    });
    if (row === null) return null;

    return {
      state: row.state,
      dueDate: row.dueDate,
      intervalDays: row.intervalDays,
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsedDays,
      scheduledDays: row.scheduledDays,
      reps: row.reps,
      lapses: row.lapses,
      lastReviewedAt: row.lastReviewedAt,
    };
  },

  async save({ cardId, outcome, reviewedAt, schedule }) {
    await prisma.$transaction([
      prisma.reviewSchedule.update({
        where: { cardId },
        data: {
          state: schedule.state,
          dueDate: schedule.dueDate,
          intervalDays: schedule.intervalDays,
          stability: schedule.stability,
          difficulty: schedule.difficulty,
          elapsedDays: schedule.elapsedDays,
          scheduledDays: schedule.scheduledDays,
          reps: schedule.reps,
          lapses: schedule.lapses,
          lastReviewedAt: schedule.lastReviewedAt,
        },
      }),
      prisma.reviewOutcome.create({ data: { cardId, outcome, reviewedAt } }),
    ]);
  },
};
