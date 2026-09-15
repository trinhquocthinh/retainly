import { prisma } from './prisma';

export async function prismaHealthProbe(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
