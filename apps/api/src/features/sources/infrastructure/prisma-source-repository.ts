import { prisma } from '../../../shared/prisma';
import type { SourceRepository } from '../application/create-source';

export const prismaSourceRepository: SourceRepository = {
  async create(source) {
    const row = await prisma.source.create({
      data: {
        userId: source.userId,
        url: source.url,
        title: source.title,
        cleanText: source.cleanText,
      },
    });

    return { ...source, id: row.id, createdAt: row.createdAt };
  },
};
