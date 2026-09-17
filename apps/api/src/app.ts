import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, errorCatalog } from './shared/errors';

import './shared/request-auth';

export function buildApp(options: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  // Mặc định chưa đăng nhập. Hook của auth-routes gắn phiên thật nếu có cookie.
  app.decorateRequest('auth', null);

  app.setNotFoundHandler((_request, reply) => {
    const entry = errorCatalog.ERR_NOT_FOUND;
    return reply.status(entry.status).send({
      error: { code: 'ERR_NOT_FOUND', message: entry.message },
    });
  });

  app.setErrorHandler<Error & { statusCode?: number }>((error, request, reply) => {
    if (error instanceof AppError) {
      const entry = errorCatalog[error.code];
      return reply.status(entry.status).send({
        error: { code: error.code, message: entry.message },
      });
    }

    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      const entry = errorCatalog.ERR_BAD_REQUEST;
      return reply.status(error.statusCode).send({
        error: { code: 'ERR_BAD_REQUEST', message: entry.message },
      });
    }

    request.log.error({ err: error }, 'Lỗi không lường trước');
    const entry = errorCatalog.ERR_INTERNAL;
    return reply.status(entry.status).send({
      error: { code: 'ERR_INTERNAL', message: entry.message },
    });
  });

  return app;
}
