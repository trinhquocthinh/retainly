import type { Schedule } from '../../review/domain/review-scheduler';
import { summarizeLibrary, type LibraryStats } from '../domain/library-stats';

/** Cổng đọc lịch FSRS của mọi thẻ thuộc một User. */
export type LibraryScheduleQuery = {
  findByUser(userId: string): Promise<Schedule[]>;
};

/** SPEC-016: số liệu trên toàn bộ Thư viện, không theo từ khoá hay bộ lọc Topic. */
export async function getLibraryStats(
  deps: { schedules: LibraryScheduleQuery; now: () => Date },
  input: { userId: string },
): Promise<LibraryStats> {
  const schedules = await deps.schedules.findByUser(input.userId);

  return summarizeLibrary(schedules, deps.now());
}
