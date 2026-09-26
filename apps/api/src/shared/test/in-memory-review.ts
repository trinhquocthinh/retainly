import type {
  RecordedOutcome,
  ReviewRepository,
  ReviewStore,
} from '../../features/review/application/review-repository';
import type { ReviewOutcome, Schedule } from '../../features/review/domain/review-scheduler';

type StoredSchedule = { ownerId: string; schedule: Schedule };
type StoredOutcome = RecordedOutcome & { outcome: ReviewOutcome };

/**
 * Repository ôn tập chạy trong bộ nhớ, dùng chung cho test application và route.
 * Transaction chỉ là gọi thẳng `work`: test đơn luồng nên không cần khoá thật —
 * phần khoá được chứng minh ở integration test trên Postgres.
 */
export function inMemoryReviews(
  seed: { ownerId: string; cardId: string; schedule: Schedule }[] = [],
): ReviewRepository & { schedules: Map<string, StoredSchedule>; outcomes: StoredOutcome[] } {
  const schedules = new Map(seed.map(({ cardId, ...row }) => [cardId, row]));
  const outcomes: StoredOutcome[] = [];
  let nextId = 1;

  const store: ReviewStore = {
    async lockSchedule(userId, cardId) {
      const row = schedules.get(cardId);
      return row?.ownerId === userId ? row.schedule : null;
    },
    async findOutcome(userId, outcomeId) {
      const found = outcomes.find((outcome) => outcome.id === outcomeId);
      return found !== undefined && schedules.get(found.cardId)?.ownerId === userId ? found : null;
    },
    async latestOutcomeId(cardId) {
      return outcomes.filter((outcome) => outcome.cardId === cardId).at(-1)?.id ?? null;
    },
    async saveOutcome({ schedule, ...outcome }) {
      // Id dạng UUID để đi qua được schema của route DELETE.
      const id = `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
      outcomes.push({ id, ...outcome });
      schedules.get(outcome.cardId)!.schedule = schedule;
      return id;
    },
    async undoOutcome({ outcomeId, cardId, schedule }) {
      outcomes.splice(
        outcomes.findIndex((outcome) => outcome.id === outcomeId),
        1,
      );
      schedules.get(cardId)!.schedule = schedule;
    },
  };

  return {
    schedules,
    outcomes,
    inTransaction: (work) => work(store),
  };
}
