import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client';
import { testDatabaseUrl } from './databaseUrl';

export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: testDatabaseUrl() }),
});

export const TEST_USER_ID = '00000000-0000-0000-0000-0000000000ff';
const OTHER_USER_ID = '00000000-0000-0000-0000-0000000000aa';

/**
 * Xoá sạch rồi seed lại hai user. TRUNCATE ... CASCADE nhanh hơn DELETE nhiều
 * lần và không phải nhớ thứ tự khoá ngoại.
 */
export async function resetDatabase(): Promise<void> {
  await testPrisma.$executeRawUnsafe(
    'truncate table users, sources, knowledge_topics, cards, review_schedules, review_outcomes cascade',
  );

  await testPrisma.user.createMany({
    data: [
      { id: TEST_USER_ID, externalAuthId: 'test:user', displayName: 'Người dùng test' },
      { id: OTHER_USER_ID, externalAuthId: 'test:other', displayName: 'Người dùng khác' },
    ],
  });
}

export { OTHER_USER_ID };
