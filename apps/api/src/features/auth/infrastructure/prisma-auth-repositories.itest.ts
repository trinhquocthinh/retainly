import { beforeEach, describe, expect, it } from 'vitest';

import { resetDatabase, testPrisma } from '../../../shared/test/db';
import {
  prismaSessionRepository,
  prismaSsoUserRepository,
  prismaUserCounter,
} from './prisma-auth-repositories';

const IDENTITY = { subject: 'authentik-sub-itest', displayName: 'Người dùng SSO' };
const EXPIRES_AT = new Date('2026-10-01T00:00:00.000Z');

beforeEach(async () => {
  await resetDatabase();
});

describe('prismaSsoUserRepository', () => {
  it('TC-021: tạo user SSO rồi tìm lại được theo subject', async () => {
    await expect(prismaSsoUserRepository.findBySubject(IDENTITY.subject)).resolves.toBeNull();

    const first = await prismaSsoUserRepository.createSso(IDENTITY);

    await expect(prismaSsoUserRepository.findBySubject(IDENTITY.subject)).resolves.toEqual(first);

    const row = await testPrisma.user.findUniqueOrThrow({ where: { id: first.id } });
    expect(row).toMatchObject({
      externalAuthId: IDENTITY.subject,
      displayName: IDENTITY.displayName,
      email: null,
      passwordHash: null,
    });
  });

  it('tạo trùng subject (callback song song) trả lại user cũ, giữ tên ban đầu', async () => {
    const first = await prismaSsoUserRepository.createSso(IDENTITY);

    const second = await prismaSsoUserRepository.createSso({
      ...IDENTITY,
      displayName: 'Tên đã đổi trên Authentik',
    });

    expect(second).toEqual(first);
    const row = await testPrisma.user.findUniqueOrThrow({ where: { id: first.id } });
    expect(row.displayName).toBe(IDENTITY.displayName);
  });
});

describe('prismaUserCounter', () => {
  it('đếm chung user SSO lẫn user nội bộ', async () => {
    const seeded = await testPrisma.user.count();
    await prismaSsoUserRepository.createSso(IDENTITY);
    await testPrisma.user.create({
      data: { email: 'noi-bo@example.com', passwordHash: 'x', displayName: 'noi-bo' },
    });

    await expect(prismaUserCounter.countUsers()).resolves.toBe(seeded + 2);
  });
});

describe('prismaSessionRepository', () => {
  it('tạo, đọc rồi xoá phiên theo token hash; xoá lần hai không lỗi', async () => {
    const user = await prismaSsoUserRepository.createSso(IDENTITY);

    await prismaSessionRepository.create({
      tokenHash: 'hash-1',
      userId: user.id,
      expiresAt: EXPIRES_AT,
    });

    await expect(prismaSessionRepository.findByTokenHash('hash-1')).resolves.toEqual({
      userId: user.id,
      expiresAt: EXPIRES_AT,
      displayName: IDENTITY.displayName,
      authMethod: 'sso',
    });

    await prismaSessionRepository.deleteByTokenHash('hash-1');
    await prismaSessionRepository.deleteByTokenHash('hash-1');

    await expect(prismaSessionRepository.findByTokenHash('hash-1')).resolves.toBeNull();
  });

  it('xoá user thì phiên của user đó bị xoá theo (cascade)', async () => {
    const user = await prismaSsoUserRepository.createSso(IDENTITY);
    await prismaSessionRepository.create({
      tokenHash: 'hash-2',
      userId: user.id,
      expiresAt: EXPIRES_AT,
    });

    await testPrisma.user.delete({ where: { id: user.id } });

    expect(await testPrisma.session.count()).toBe(0);
  });
});
