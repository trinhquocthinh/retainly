import { prisma } from '../../../shared/prisma';
import type { StreakQuery } from '../application/get-current-streak';

type ReviewDayRow = { reviewDay: string };

export const prismaStreakQuery: StreakQuery = {
  async findReviewDaysBy(userId) {
    const rows = await prisma.$queryRaw<ReviewDayRow[]>`
      SELECT DISTINCT
        to_char(reviewed_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS "reviewDay"
      FROM review_outcomes
      INNER JOIN cards ON cards.id = review_outcomes.card_id
      WHERE cards.user_id = ${userId}::uuid
      ORDER BY "reviewDay" DESC
    `;

    return rows.map((row) => row.reviewDay);
  },
};
