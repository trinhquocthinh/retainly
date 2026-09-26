import * as oidc from 'openid-client';

import type { SsoClient } from '../application/sign-in-with-sso';

type OpenIdSsoConfig = {
  issuer: URL;
  clientId: string;
  clientSecret: string;
  redirectUri: URL;
};

export function createOpenIdSsoClient(config: OpenIdSsoConfig): SsoClient {
  let discovered: Promise<oidc.Configuration> | undefined;

  // Discovery lười và nhớ kết quả: API vẫn khởi động được (health 200) khi
  // Authentik tạm chết. Lần lỗi không được nhớ, request sau sẽ thử lại.
  function configuration(): Promise<oidc.Configuration> {
    discovered ??= oidc
      .discovery(config.issuer, config.clientId, config.clientSecret)
      .catch((error: unknown) => {
        discovered = undefined;
        throw error;
      });
    return discovered;
  }

  return {
    async startLogin() {
      const transaction = {
        state: oidc.randomState(),
        nonce: oidc.randomNonce(),
        codeVerifier: oidc.randomPKCECodeVerifier(),
      };

      const authorizationUrl = oidc.buildAuthorizationUrl(await configuration(), {
        redirect_uri: config.redirectUri.href,
        scope: 'openid profile',
        state: transaction.state,
        nonce: transaction.nonce,
        code_challenge: await oidc.calculatePKCECodeChallenge(transaction.codeVerifier),
        code_challenge_method: 'S256',
      });

      return { authorizationUrl, transaction };
    },

    async finishLogin(callbackUrl, transaction) {
      // openid-client lấy redirect_uri gửi lên token endpoint từ callbackUrl bỏ
      // query, nên callbackUrl phải dựng trên APP_ORIGIN chứ không phải Host header.
      const tokens = await oidc.authorizationCodeGrant(await configuration(), callbackUrl, {
        pkceCodeVerifier: transaction.codeVerifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (claims === undefined) throw new Error('Authentik không trả id_token');

      return { subject: claims.sub, displayName: displayNameFrom(claims) };
    },
  };
}

function displayNameFrom(claims: oidc.IDToken): string {
  for (const key of ['name', 'preferred_username']) {
    const value = claims[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return 'Người dùng Authentik';
}
