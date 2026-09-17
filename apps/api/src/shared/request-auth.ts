import type { FastifyRequest } from 'fastify';

import { AppError } from './errors';

type RequestAuth = {
  userId: string;
  expiresAt: Date;
};

declare module 'fastify' {
  interface FastifyRequest {
    /** Phiên của request, do hook trong auth-routes gắn. `null` = chưa đăng nhập. */
    auth: RequestAuth | null;
  }
}

/** Route cần đăng nhập gọi hàm này ở đầu handler; không có phiên thì trả 401. */
export function requireAuth(request: FastifyRequest): RequestAuth {
  if (request.auth === null) throw new AppError('ERR_UNAUTHORIZED');
  return request.auth;
}
