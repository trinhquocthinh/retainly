function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Thiếu biến môi trường ${name}`);
  }
  return value;
}

/** Đọc cấu hình xác thực lúc khởi động. Thiếu biến thì dừng ngay, không chạy nửa vời. */
export function readAuthConfig(env: NodeJS.ProcessEnv) {
  const cookieSecret = required(env, 'SESSION_COOKIE_SECRET');
  // @fastify/cookie ký HMAC bằng secret này; ngắn quá thì đoán được chữ ký.
  if (cookieSecret.length < 32) {
    throw new Error('SESSION_COOKIE_SECRET phải dài ít nhất 32 ký tự');
  }

  const appOrigin = new URL(required(env, 'APP_ORIGIN'));

  return {
    appOrigin,
    cookieSecret,
    oidc: {
      issuer: new URL(required(env, 'OIDC_ISSUER')),
      clientId: required(env, 'OIDC_CLIENT_ID'),
      clientSecret: required(env, 'OIDC_CLIENT_SECRET'),
      redirectUri: new URL('/api/auth/sso/callback', appOrigin),
    },
  };
}
