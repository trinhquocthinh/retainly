import type { Prisma } from '../../../generated/prisma/client';
import { prisma } from '../../../shared/prisma';
import type { ReviewRepository, ReviewStore } from '../application/review-repository';
import type { Schedule } from '../domain/review-scheduler';

export const SCHEDULE_COLUMNS = {
  state: true,
  dueDate: true,
  intervalDays: true,
  stability: true,
  difficulty: true,
  elapsedDays: true,
  scheduledDays: true,
  reps: true,
  lapses: true,
  lastReviewedAt: true,
} as const;

/** Dạng JSON của Schedule trong cột previous_schedule: mốc thời gian lưu ISO. */
type ScheduleSnapshot = Omit<Schedule, 'dueDate' | 'lastReviewedAt'> & {
  dueDate: string;
  lastReviewedAt: string | null;
};

function toSnapshot(schedule: Schedule): ScheduleSnapshot {
  return {
    ...schedule,
    dueDate: schedule.dueDate.toISOString(),
    lastReviewedAt: schedule.lastReviewedAt?.toISOString() ?? null,
  };
}

function fromSnapshot(json: Prisma.JsonValue | null): Schedule | null {
  if (json === null) return null;

  // Cột này chỉ do toSnapshot ghi, nên tin được hình dạng mà không kiểm lại.
  const snapshot = json as ScheduleSnapshot;
  return {
    ...snapshot,
    dueDate: new Date(snapshot.dueDate),
    lastReviewedAt: snapshot.lastReviewedAt === null ? null : new Date(snapshot.lastReviewedAt),
  };
}

function storeFor(tx: Prisma.TransactionClient): ReviewStore {
  return {
    async lockSchedule(userId, cardId) {
      // Prisma Client không có SELECT … FOR UPDATE: khoá bằng raw, đọc lại qua
      // client để giữ ánh xạ kiểu. Dòng đã khoá thì lần đọc sau không đổi được.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT rs.id
        FROM review_schedules rs
        JOIN cards c ON c.id = rs.card_id
        WHERE rs.card_id = ${cardId}::uuid AND c.user_id = ${userId}::uuid
        FOR UPDATE OF rs
      `;
      if (locked.length === 0) return null;

      return tx.reviewSchedule.findUniqueOrThrow({
        where: { cardId },
        select: SCHEDULE_COLUMNS,
      });
    },

    async findOutcome(userId, outcomeId) {
      const row = await tx.reviewOutcome.findFirst({
        where: { id: outcomeId, card: { userId } },
        select: { id: true, cardId: true, reviewedAt: true, previousSchedule: true },
      });
      if (row === null) return null;

      return { ...row, previousSchedule: fromSnapshot(row.previousSchedule) };
    },

    async latestOutcomeId(cardId) {
      const row = await tx.reviewOutcome.findFirst({
        where: { cardId },
        orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      });
      return row?.id ?? null;
    },

    async saveOutcome({ cardId, outcome, reviewedAt, schedule, previousSchedule }) {
      await tx.reviewSchedule.update({ where: { cardId }, data: schedule });
      const row = await tx.reviewOutcome.create({
        data: { cardId, outcome, reviewedAt, previousSchedule: toSnapshot(previousSchedule) },
        select: { id: true },
      });
      return row.id;
    },

    async undoOutcome({ outcomeId, cardId, schedule }) {
      await tx.reviewOutcome.delete({ where: { id: outcomeId } });
      await tx.reviewSchedule.update({ where: { cardId }, data: schedule });
    },
  };
}

export const prismaReviewRepository: ReviewRepository = {
  inTransaction: (work) => prisma.$transaction((tx) => work(storeFor(tx))),
};
