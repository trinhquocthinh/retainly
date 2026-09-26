import { prisma } from '../../../shared/prisma';
import { SCHEDULE_COLUMNS } from '../../review/infrastructure/prisma-review-repository';
import type { LibraryScheduleQuery } from '../application/get-library-stats';

export const prismaLibraryScheduleQuery: LibraryScheduleQuery = {
  findByUser(userId) {
    return prisma.reviewSchedule.findMany({
      where: { card: { userId } },
      select: SCHEDULE_COLUMNS,
    });
  },
};
