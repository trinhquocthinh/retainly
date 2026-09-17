import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { AppError } from '../../../shared/errors';
import { requireAuth } from '../../../shared/request-auth';
import { endSession, resolveSession, type SessionRepository } from '../application/sessions';
import {
  signInWithSso,
  type SsoClient,
  type SsoIdentity,
  type SsoTransaction,
  type SsoUserRepository,
} from '../application/sign-in-with-sso';

const SESSION_COOKIE = 'retainly_session';
const SSO_COOKIE = 'retainly_sso';
// Cookie tạm chỉ cần gửi kèm tới callback, không đi theo mọi request /api.
const SSO_COOKIE_PATH = '/api/auth/sso';
const SSO_COOKIE_MAX_AGE_SECONDS = 10 * 60;

type AuthRoutesDeps = {
  sso: SsoClient;
  users: SsoUserRepository;
  sessions: SessionRepository;
  now: () => Date;
  appOrigin: URL;
  cookieSecret: string;
};

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRoutesDeps): void {
  // Dev chạy http://localhost nên không đặt được Secure; SIT/Production là https.
  const secure = deps.appOrigin.protocol === 'https:';

  void app.register(fastifyCookie, { secret: deps.cookieSecret });

  // Gắn phiên cho mọi request. Hook không tự chặn: route nào cần đăng nhập thì
  // gọi requireAuth, nhờ vậy /api/health và chính các route đăng nhập vẫn mở.
  app.addHook('onRequest', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    request.auth = token === undefined ? null : await resolveSession(deps, token);
  });

  app.get('/api/auth/sso/login', async (_request, reply) => {
    const { authorizationUrl, transaction } = await deps.sso.startLogin();

    reply.setCookie(SSO_COOKIE, JSON.stringify(transaction), {
      signed: true,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: SSO_COOKIE_PATH,
      maxAge: SSO_COOKIE_MAX_AGE_SECONDS,
    });

    return reply.redirect(authorizationUrl.href);
  });

  app.get('/api/auth/sso/callback', async (request, reply) => {
    const transaction = readTransaction(request);
    // Dùng một lần: xoá ngay dù callback thành công hay thất bại.
    reply.clearCookie(SSO_COOKIE, { path: SSO_COOKIE_PATH });
    if (transaction === null) throw new AppError('ERR_UNAUTHORIZED');

    let identity: SsoIdentity;
    try {
      identity = await deps.sso.finishLogin(new URL(request.url, deps.appOrigin), transaction);
    } catch (error) {
      // Người dùng bấm từ chối, state lệch, code hết hạn, Authentik lỗi mạng...
      // đều là "chưa đăng nhập được"; chi tiết chỉ nằm trong log.
      request.log.warn({ err: error }, 'Đăng nhập SSO thất bại');
      throw new AppError('ERR_UNAUTHORIZED');
    }

    const { token, session } = await signInWithSso(deps, identity);

    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    });

    return reply.redirect('/');
  });

  app.get('/api/session', async (request) => {
    const auth = requireAuth(request);
    return { session: { userId: auth.userId, expiresAt: auth.expiresAt.toISOString() } };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token !== undefined) await endSession(deps, token);

    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.status(204).send();
  });
}

function readTransaction(request: FastifyRequest): SsoTransaction | null {
  const raw = request.cookies[SSO_COOKIE];
  if (raw === undefined) return null;

  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || unsigned.value === null) return null;

  // Chữ ký hợp lệ nghĩa là chính server này tạo ra giá trị, JSON tin được.
  return JSON.parse(unsigned.value) as SsoTransaction;
}
