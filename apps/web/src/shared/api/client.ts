/** Lỗi nghiệp vụ do máy chủ trả về, theo khuôn lỗi thống nhất của SDD. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Không tới được máy chủ — mất mạng, DNS hỏng, server chết.
 * Tách hẳn khỏi ApiError vì chỉ loại này mới đáng thử lại (NFR#2):
 * thử lại một ERR_EMPTY_BACK thì lần nào cũng hỏng như lần đầu.
 */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Không kết nối được máy chủ');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Đăng ký nơi xử lý 401 tập trung. E4-S1-T3 sẽ dùng để đẩy về /login
 * thay vì rải kiểm tra ở từng lời gọi.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) return payload as T;

  if (response.status === 401) unauthorizedHandler?.();

  const error = (payload as { error?: { code: string; message: string } } | null)?.error;

  throw new ApiError(
    error?.code ?? 'ERR_INTERNAL',
    error?.message ?? 'Có lỗi xảy ra, thử lại sau',
    response.status,
  );
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
};
