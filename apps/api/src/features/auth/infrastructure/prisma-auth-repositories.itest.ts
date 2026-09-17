import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../../../shared/test/db';
import { prismaSessionRepository, prismaSsoUserRepository } from './prisma-auth-repositories';

const IDENTITY = { subject: 'authentik-sub-itest', displayName: 'Người dùng SSO' };
const EXPIRES_AT = new Date('2026-10-01T00:00:00.000Z');

beforeEach(async () => {
  await resetDatabase();
});

describe('prismaSsoUserRepository', () => {
  it('TC-021: tạo user SSO ở lần đầu, lần sau trả lại đúng user đó', async () => {
    const first = await prismaSsoUserRepository.findOrCreateBySubject(IDENTITY);
    const second = await prismaSsoUserRepository.findOrCreateBySubject({
      ...IDENTITY,
      displayName: 'Tên đã đổi trên Authentik',
    });

    expect(second.id).toBe(first.id);

    const row = await testPrisma.user.findUniqueOrThrow({ where: { id: first.id } });
    expect(row).toMatchObject({
      externalAuthId: IDENTITY.subject,
      displayName: IDENTITY.displayName,
      email: null,
      passwordHash: null,
    });
  });
});

describe('prismaSessionRepository', () => {
  it('tạo, đọc rồi xoá phiên theo token hash; xoá lần hai không lỗi', async () => {
    const user = await prismaSsoUserRepository.findOrCreateBySubject(IDENTITY);

    await prismaSessionRepository.create({
      tokenHash: 'hash-1',
      userId: user.id,
      expiresAt: EXPIRES_AT,
    });

    await expect(prismaSessionRepository.findByTokenHash('hash-1')).resolves.toEqual({
      userId: user.id,
      expiresAt: EXPIRES_AT,
    });

    await prismaSessionRepository.deleteByTokenHash('hash-1');
    await prismaSessionRepository.deleteByTokenHash('hash-1');

    await expect(prismaSessionRepository.findByTokenHash('hash-1')).resolves.toBeNull();
  });

  it('xoá user thì phiên của user đó bị xoá theo (cascade)', async () => {
    const user = await prismaSsoUserRepository.findOrCreateBySubject(IDENTITY);
    await prismaSessionRepository.create({
      tokenHash: 'hash-2',
      userId: user.id,
      expiresAt: EXPIRES_AT,
    });

    await testPrisma.user.delete({ where: { id: user.id } });

    expect(await testPrisma.session.count()).toBe(0);
  });
});
