import type { FastifyInstance } from 'fastify';

export const SIGNED_IN_USER_ID = '00000000-0000-0000-0000-0000000000ff';

/**
 * Giả lập hook phiên của auth-routes cho test route nghiệp vụ: mọi request đều
 * đã đăng nhập bằng `userId`. Test luồng cookie thật nằm ở auth-routes.test.ts.
 */
export function signInAs(app: FastifyInstance, userId: string = SIGNED_IN_USER_ID): void {
  app.addHook('onRequest', async (request) => {
    request.auth = {
      userId,
      expiresAt: new Date('2099-01-01T00:00:00Z'),
      displayName: 'Người dùng test',
      authMethod: 'sso',
    };
  });
}
