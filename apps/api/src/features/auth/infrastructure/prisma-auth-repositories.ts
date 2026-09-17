import { prisma } from '../../../shared/prisma';
import type { SessionRepository } from '../application/sessions';
import type { SsoUserRepository } from '../application/sign-in-with-sso';

export const prismaSsoUserRepository: SsoUserRepository = {
  async findOrCreateBySubject({ subject, displayName }) {
    // update rỗng: tên hiển thị chỉ lấy từ Authentik ở lần đầu, về sau thuộc về app.
    return prisma.user.upsert({
      where: { externalAuthId: subject },
      update: {},
      create: { externalAuthId: subject, displayName },
      select: { id: true },
    });
  },
};

export const prismaSessionRepository: SessionRepository = {
  async create(session) {
    await prisma.session.create({ data: session });
  },

  async findByTokenHash(tokenHash) {
    return prisma.session.findUnique({
      where: { tokenHash },
      select: { userId: true, expiresAt: true },
    });
  },

  async deleteByTokenHash(tokenHash) {
    // deleteMany thay vì delete: đăng xuất hai lần không được thành lỗi 500.
    await prisma.session.deleteMany({ where: { tokenHash } });
  },
};
