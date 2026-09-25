import { randomInt } from 'node:crypto';

import { prisma } from '../../../shared/prisma';
import { resetLocalPassword } from '../application/reset-password';
import { argon2PasswordHasher } from '../infrastructure/argon2-password-hasher';
import { prismaLocalUserRepository } from '../infrastructure/prisma-auth-repositories';

/**
 * Công cụ quản trị (BR-027, runbook doc 10 §8). Trên server:
 *   docker exec retainly-<env>-api node apps/api/dist/features/auth/cli/reset-password.js <email>
 * Output của `docker exec` không vào `docker logs`: mật khẩu tạm chỉ hiện một lần ở đây.
 */
async function main(args: string[]): Promise<number> {
  const [email] = args;
  if (args.length !== 1 || !email.includes('@')) {
    console.error('Cách dùng: reset-password <email>');
    return 1;
  }

  const result = await resetLocalPassword(
    {
      localUsers: prismaLocalUserRepository,
      hasher: argon2PasswordHasher,
      randomInt: (max) => randomInt(max),
    },
    email,
  );

  if (result.status === 'not-local') {
    console.error(`Không có tài khoản nội bộ nào dùng email ${email}.`);
    console.error('Tài khoản SSO khôi phục qua Authentik — xem doc 10 §8.2.');
    return 1;
  }

  console.log(`Đã đặt lại mật khẩu cho ${email} và huỷ mọi phiên đăng nhập.`);
  console.log(`Mật khẩu tạm (chỉ hiện một lần): ${result.temporaryPassword}`);
  return 0;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
