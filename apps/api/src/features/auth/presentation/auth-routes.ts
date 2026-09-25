import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AppError } from '../../../shared/errors';
import { requireAuth } from '../../../shared/request-auth';
import {
  endSession,
  resolveSession,
  type SessionRecord,
  type SessionRepository,
  type StartedSession,
} from '../application/sessions';
import { changePassword } from '../application/change-password';
import {
  signInWithSso,
  type SsoClient,
  type SsoIdentity,
  type SsoTransaction,
  type SsoUserRepository,
} from '../application/sign-in-with-sso';
import {
  LocalUserRepository,
  PasswordHasher,
  registerLocal,
  signInLocal,
} from '../application/local-credentials';
import { UserCounter } from '../application/user-limit';
import { DISPLAY_NAME_MAX_LENGTH } from '../domain/local-credentials';

const SESSION_COOKIE = 'retainly_session';
const SSO_COOKIE = 'retainly_sso';
// Cookie tạm chỉ cần gửi kèm tới callback, không đi theo mọi request /api.
const SSO_COOKIE_PATH = '/api/auth/sso';
const SSO_COOKIE_MAX_AGE_SECONDS = 10 * 60;

type CredentialsBody = { email: string; password: string };
type RegisterBody = CredentialsBody & { displayName?: string };
type LoginBody = CredentialsBody & { remember: boolean };
type ChangePasswordBody = { currentPassword: string; newPassword: string };

/**
 * Chống dò mật khẩu: mỗi IP được 10 request / 15 phút cho từng route đăng nhập,
 * đăng ký, đổi mật khẩu (ba bộ đếm riêng). Đếm mọi request chứ không chỉ lần sai. Cố ý không
 * khoá theo email: kẻ xấu sẽ gõ sai 10 lần để khoá tài khoản của nạn nhân.
 */
export const CREDENTIALS_RATE_LIMIT = { max: 10, timeWindow: 15 * 60 * 1000 };

const credentialsSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', maxLength: 254 },
      // Không đặt minLength: mật khẩu ngắn phải ra ERR_WEAK_PASSWORD, không phải
      // ERR_BAD_REQUEST. maxLength chặn chuỗi khổng lồ bắt Argon2 băm vô ích.
      password: { type: 'string', maxLength: 1024 },
    },
  },
} as const;

// Đăng ký nhận thêm ô "Họ và tên" (US-019), tuỳ chọn: thiếu thì use case lấy phần
// trước `@` của email. Quá dài là lỗi của client (web đã chặn) nên để Ajv trả 400.
const registerSchema = {
  body: {
    ...credentialsSchema.body,
    properties: {
      ...credentialsSchema.body.properties,
      displayName: { type: 'string', maxLength: DISPLAY_NAME_MAX_LENGTH },
    },
  },
} as const;

// Đăng nhập nhận thêm ô "Duy trì đăng nhập 30 ngày" (US-019). Thiếu thì Ajv của
// Fastify điền `false` (useDefaults) — client cũ vẫn chạy, ra phiên trình duyệt.
const loginSchema = {
  body: {
    ...credentialsSchema.body,
    properties: {
      ...credentialsSchema.body.properties,
      remember: { type: 'boolean', default: false },
    },
  },
} as const;

// maxLength cùng lý do như credentialsSchema; luật mạnh do use case kiểm.
const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', maxLength: 1024 },
      newPassword: { type: 'string', maxLength: 1024 },
    },
  },
} as const;

type AuthRoutesDeps = {
  localUsers: LocalUserRepository;
  hasher: PasswordHasher;
  sso: SsoClient;
  users: SsoUserRepository;
  sessions: SessionRepository;
  userCounter: UserCounter;
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

  app.get('/api/auth/sso/login', async (request, reply) => {
    let started: Awaited<ReturnType<SsoClient['startLogin']>>;
    try {
      started = await deps.sso.startLogin();
    } catch (error) {
      // Authentik chết thì discovery hỏng; người dùng đang đứng trên trình duyệt
      // nên trả về màn đăng nhập kèm lý do, không trả JSON 500.
      request.log.warn({ err: error }, 'Không mở được đăng nhập SSO');
      return reply.redirect(loginErrorPath('sso_failed'));
    }

    reply.setCookie(SSO_COOKIE, JSON.stringify(started.transaction), {
      signed: true,
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: SSO_COOKIE_PATH,
      maxAge: SSO_COOKIE_MAX_AGE_SECONDS,
    });

    return reply.redirect(started.authorizationUrl.href);
  });

  // Callback do trình duyệt đi tới sau Authentik, không phải fetch của SPA: mọi
  // kết cục đều là redirect, thất bại thì về /login?error=<lý do> cho UI hiện banner.
  app.get('/api/auth/sso/callback', async (request, reply) => {
    const transaction = readTransaction(request);
    // Dùng một lần: xoá ngay dù callback thành công hay thất bại.
    reply.clearCookie(SSO_COOKIE, { path: SSO_COOKIE_PATH });
    if (transaction === null) return reply.redirect(loginErrorPath('sso_failed'));

    let identity: SsoIdentity;
    try {
      identity = await deps.sso.finishLogin(new URL(request.url, deps.appOrigin), transaction);
    } catch (error) {
      // Người dùng bấm từ chối, state lệch, code hết hạn, Authentik lỗi mạng...
      // đều là "chưa đăng nhập được"; chi tiết chỉ nằm trong log.
      request.log.warn({ err: error }, 'Đăng nhập SSO thất bại');
      return reply.redirect(loginErrorPath('sso_failed'));
    }

    try {
      setSessionCookie(reply, await signInWithSso(deps, identity), secure);
    } catch (error) {
      if (error instanceof AppError && error.code === 'ERR_USER_LIMIT_REACHED') {
        return reply.redirect(loginErrorPath('user_limit'));
      }
      throw error;
    }

    return reply.redirect('/');
  });

  // Plugin rate limit gắn hook qua onRoute nên phải nạp xong trước khi khai báo
  // route; bọc trong một scope riêng để chờ được mà registerAuthRoutes vẫn đồng bộ.
  void app.register(async (scope) => {
    await scope.register(fastifyRateLimit, {
      global: false,
      errorResponseBuilder: () => new AppError('ERR_TOO_MANY_REQUESTS'),
    });

    const rateLimit = { config: { rateLimit: CREDENTIALS_RATE_LIMIT } };

    scope.post<{ Body: RegisterBody }>(
      '/api/auth/register',
      { schema: registerSchema, ...rateLimit },
      async (request, reply) => {
        const signedIn = await registerLocal(deps, request.body);
        setSessionCookie(reply, signedIn, secure);
        return reply.status(201).send({ session: toSessionDto(signedIn.session) });
      },
    );

    scope.post<{ Body: LoginBody }>(
      '/api/auth/login',
      { schema: loginSchema, ...rateLimit },
      async (request, reply) => {
        const signedIn = await signInLocal(deps, request.body);
        setSessionCookie(reply, signedIn, secure);
        return reply.status(200).send({ session: toSessionDto(signedIn.session) });
      },
    );

    // BR-027: sai mật khẩu hiện tại trả ERR_INVALID_CREDENTIALS (401) như đăng
    // nhập — web phân biệt với hết phiên (ERR_UNAUTHORIZED) theo mã lỗi.
    scope.post<{ Body: ChangePasswordBody }>(
      '/api/auth/password',
      { schema: changePasswordSchema, ...rateLimit },
      async (request, reply) => {
        const { userId } = requireAuth(request);
        await changePassword(deps, {
          userId,
          // Đã qua requireAuth thì cookie chắc chắn có; chuỗi rỗng chỉ khiến
          // không phiên nào được giữ — hỏng theo hướng an toàn.
          sessionToken: request.cookies[SESSION_COOKIE] ?? '',
          ...request.body,
        });
        return reply.status(204).send();
      },
    );
  });

  app.get('/api/session', async (request) => {
    const auth = requireAuth(request);
    return {
      session: {
        ...toSessionDto(auth),
        displayName: auth.displayName,
        authMethod: auth.authMethod,
      },
    };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token !== undefined) await endSession(deps, token);

    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.status(204).send();
  });
}

/** Lý do thất bại SSO gửi kèm về màn đăng nhập. Web đọc cùng bộ giá trị này. */
type SsoFailure = 'sso_failed' | 'user_limit';

function loginErrorPath(reason: SsoFailure): string {
  return `/login?error=${reason}`;
}

function readTransaction(request: FastifyRequest): SsoTransaction | null {
  const raw = request.cookies[SSO_COOKIE];
  if (raw === undefined) return null;

  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || unsigned.value === null) return null;

  // Chữ ký hợp lệ nghĩa là chính server này tạo ra giá trị, JSON tin được.
  return JSON.parse(unsigned.value) as SsoTransaction;
}

/**
 * Không tick "Duy trì đăng nhập" thì cookie không có `Expires`: trình duyệt xoá
 * khi đóng, còn `expiresAt` 24 giờ phía server chặn trường hợp nó được khôi phục.
 */
function setSessionCookie(
  reply: FastifyReply,
  { token, session, remember }: StartedSession,
  secure: boolean,
): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    ...(remember ? { expires: session.expiresAt } : {}),
  });
}

function toSessionDto(session: SessionRecord) {
  return { userId: session.userId, expiresAt: session.expiresAt.toISOString() };
}
