import type { Prisma } from '../../../generated/prisma/client';
import { prisma } from '../../../shared/prisma';
import { AppError } from '../../../shared/errors';
import { startOfToday } from '../domain/due-window';
import type {
  PracticeRecord,
  PracticeRepository,
  PracticeStore,
} from '../application/practice-repository';
import { SCHEDULE_COLUMNS, storeFor } from './prisma-review-repository';

const INCLUDE = {
  items: {
    orderBy: { position: 'asc' },
    include: { card: { include: { schedule: { select: SCHEDULE_COLUMNS } } } },
  },
} as const;

type Row = Prisma.PracticeSessionGetPayload<{ include: typeof INCLUDE }>;

function toRecord(row: Row): PracticeRecord {
  return {
    id: row.id,
    size: row.size,
    undoUsed: row.undoUsed,
    topicId: row.topicId,
    status: row.status,
    createdAt: row.createdAt,
    closedAt: row.closedAt,
    items: row.items.map((item) => ({
      id: item.id,
      card: item.card?.schedule
        ? {
            card: {
              id: item.card.id,
              front: item.card.front,
              back: item.card.back,
              note: item.card.note,
              dueDate: item.card.schedule.dueDate,
            },
            schedule: item.card.schedule,
          }
        : null,
      answer:
        item.outcomeValue !== null && item.answeredAt !== null
          ? {
              id: item.outcomeId,
              outcome: item.outcomeValue,
              reviewedAt: item.answeredAt,
            }
          : null,
    })),
  };
}

function availableWhere(userId: string, now: Date, topicId?: string): Prisma.CardWhereInput {
  return {
    userId,
    topicId,
    schedule: { isNot: null },
    outcomes: { none: { reviewedAt: { gte: startOfToday(now) } } },
  };
}

function practiceStore(tx: Prisma.TransactionClient): PracticeStore {
  return {
    reviews: storeFor(tx),
    async findActive(userId) {
      const row = await tx.practiceSession.findFirst({
        where: { userId, status: 'active' },
        include: INCLUDE,
      });
      return row === null ? null : toRecord(row);
    },
    async findSession(userId, id) {
      const row = await tx.practiceSession.findFirst({ where: { id, userId }, include: INCLUDE });
      return row === null ? null : toRecord(row);
    },
    async findCandidates(userId, now, topicId) {
      if (
        topicId !== undefined &&
        (await tx.knowledgeTopic.findFirst({
          where: { id: topicId, userId },
          select: { id: true },
        })) === null
      ) {
        throw new AppError('ERR_TOPIC_NOT_FOUND');
      }
      const cards = await tx.card.findMany({
        where: availableWhere(userId, now, topicId),
        select: {
          id: true,
          topicId: true,
          sourceId: true,
          createdAt: true,
          schedule: { select: SCHEDULE_COLUMNS },
        },
      });
      return cards.flatMap((card) =>
        card.schedule === null ? [] : [{ ...card, schedule: card.schedule }],
      );
    },
    async createSession({ userId, size, topicId, cardIds, now }) {
      return toRecord(
        await tx.practiceSession.create({
          data: {
            userId,
            size,
            topicId,
            createdAt: now,
            items: { create: cardIds.map((cardId, position) => ({ cardId, position })) },
          },
          include: INCLUDE,
        }),
      );
    },
    async linkAnswer(id, outcomeId) {
      const outcome = await tx.reviewOutcome.findUniqueOrThrow({ where: { id: outcomeId } });
      const item = await tx.practiceItem.update({
        where: { id },
        data: { outcomeId, outcomeValue: outcome.outcome, answeredAt: outcome.reviewedAt },
      });
      await tx.practiceSession.update({ where: { id: item.sessionId }, data: { undoUsed: false } });
    },
    async unlinkAnswer(id) {
      await tx.practiceItem.update({
        where: { id },
        data: { outcomeId: null, outcomeValue: null, answeredAt: null },
      });
    },
    async markUndoUsed(id) {
      await tx.practiceSession.update({ where: { id }, data: { undoUsed: true } });
    },
    async setStatus(id, status, closedAt) {
      await tx.practiceSession.update({ where: { id }, data: { status, closedAt } });
    },
  };
}

export const prismaPracticeRepository: PracticeRepository = {
  inTransaction(userId, work) {
    return prisma.$transaction(async (tx) => {
      // User là khoá chung kể cả khi chưa có bài; tránh hai request cùng tạo bài.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      return work(practiceStore(tx));
    });
  },
  async overview(userId, now) {
    const [active, completedToday, availableCount] = await Promise.all([
      prisma.practiceSession.findFirst({
        where: { userId, status: 'active' },
        select: { id: true },
      }),
      prisma.practiceSession.count({
        where: { userId, status: 'completed', closedAt: { gte: startOfToday(now) } },
      }),
      prisma.card.count({ where: availableWhere(userId, now) }),
    ]);
    return { activeSessionId: active?.id ?? null, completedToday, availableCount };
  },
};
