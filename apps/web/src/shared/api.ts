export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Gọi API cùng origin. Production đi qua Caddy (/api/* → container api),
 * dev đi qua proxy của Vite — nên đường dẫn luôn tương đối, không bao giờ
 * ghép host vào đây.
 */
export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as { error?: { code: string; message: string } } | null)?.error;
    throw new ApiRequestError(
      error?.code ?? 'ERR_INTERNAL',
      error?.message ?? 'Có lỗi xảy ra, thử lại sau',
    );
  }

  return payload as T;
}
