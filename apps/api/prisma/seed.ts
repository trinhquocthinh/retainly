import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

import { DEFAULT_USER_EXTERNAL_AUTH_ID, DEFAULT_USER_ID } from '../src/shared/default-user';

const connectionString = process.env['DATABASE_URL'];
if (connectionString === undefined) {
  throw new Error('Thiếu DATABASE_URL — chạy seed qua `yarn workspace api prisma db seed`');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      externalAuthId: DEFAULT_USER_EXTERNAL_AUTH_ID,
      displayName: 'Chủ dự án',
    },
  });
  console.log(`Seed xong: user mặc định ${user.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
