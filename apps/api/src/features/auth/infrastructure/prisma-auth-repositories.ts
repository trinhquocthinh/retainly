import { Prisma } from '../../../generated/prisma/client';
import { AppError } from '../../../shared/errors';
import { prisma } from '../../../shared/prisma';
import type { LocalUserRepository } from '../application/local-credentials';
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

export const prismaLocalUserRepository: LocalUserRepository = {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
  },

  async createLocal(user) {
    try {
      return await prisma.user.create({ data: user, select: { id: true } });
    } catch (error) {
      // Hai request đăng ký cùng email chạy song song đều qua được bước kiểm tra
      // trước; unique index chặn request sau, đổi thành lỗi nghiệp vụ thay vì 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('ERR_EMAIL_TAKEN');
      }
      throw error;
    }
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
