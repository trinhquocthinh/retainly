import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env['DATABASE_URL'];
if (connectionString === undefined) throw new Error('Thiếu DATABASE_URL');

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
