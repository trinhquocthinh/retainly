import { Prisma } from '../../../generated/prisma/client';
import { AppError } from '../../../shared/errors';
import { prisma } from '../../../shared/prisma';
import type { LocalUserRepository } from '../application/local-credentials';
import type { SessionRepository } from '../application/sessions';
import type { SsoUserRepository } from '../application/sign-in-with-sso';
import { UserCounter } from '../application/user-limit';

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export const prismaUserCounter: UserCounter = {
  async countUsers() {
    return prisma.user.count();
  },
};

export const prismaSsoUserRepository: SsoUserRepository = {
  async findBySubject(subject) {
    return prisma.user.findUnique({ where: { externalAuthId: subject }, select: { id: true } });
  },

  async createSso({ subject, displayName }) {
    try {
      // Tên hiển thị chỉ lấy từ Authentik ở lần đầu, về sau thuộc về app.
      return await prisma.user.create({
        data: { externalAuthId: subject, displayName },
        select: { id: true },
      });
    } catch (error) {
      // Hai callback cùng subject chạy song song: request sau dùng lại user vừa tạo.
      if (!isUniqueViolation(error)) throw error;
      return prisma.user.findUniqueOrThrow({
        where: { externalAuthId: subject },
        select: { id: true },
      });
    }
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
      if (isUniqueViolation(error)) throw new AppError('ERR_EMAIL_TAKEN');
      throw error;
    }
  },

  async replacePassword(userId, passwordHash) {
    // Chung một transaction: không có lúc nào mật khẩu đã đổi mà phiên cũ vẫn sống.
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);
  },
};

export const prismaSessionRepository: SessionRepository = {
  async create(session) {
    await prisma.session.create({ data: session });
  },

  async findByTokenHash(tokenHash) {
    // Lấy luôn tên hiển thị trong cùng một query: hook phiên chạy ở mọi request.
    const row = await prisma.session.findUnique({
      where: { tokenHash },
      select: { userId: true, expiresAt: true, user: { select: { displayName: true } } },
    });
    if (row === null) return null;

    return { userId: row.userId, expiresAt: row.expiresAt, displayName: row.user.displayName };
  },

  async deleteByTokenHash(tokenHash) {
    // deleteMany thay vì delete: đăng xuất hai lần không được thành lỗi 500.
    await prisma.session.deleteMany({ where: { tokenHash } });
  },
};
