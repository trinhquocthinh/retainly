import { prisma } from '../../../shared/prisma';
import { SourceOwnership } from '../application/create-card';

export const prismaSourceOwnership: SourceOwnership = {
  async belongsToUser({ userId, sourceId }) {
    const count = await prisma.source.count({ where: { id: sourceId, userId } });
    return count > 0;
  },
};
