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
    super('Chưa thể kết nối. Kiểm tra mạng rồi thử lại.');
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

/** Máy chủ không trả lời trong hạn. Đáng thử lại, khác hẳn lỗi nghiệp vụ. */
export class TimeoutError extends Error {
  constructor() {
    super('Phản hồi mất nhiều thời gian hơn dự kiến. Vui lòng thử lại.');
    this.name = 'TimeoutError';
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Mọi 5xx đều đáng thử lại: 500 là ngoại lệ ngoài dự kiến phía máy chủ (ở quy
 * mô này thường là database chưa sẵn sàng), 502/503/504 là máy chủ chết hoặc
 * quá tải sau proxy — proxy vẫn trả về một phản hồi HTTP hợp lệ nên chúng là
 * ApiError chứ không phải NetworkError (đo được ở E1-S3-T6).
 * Dưới 500 là lỗi do chính yêu cầu gây ra: gửi lại y hệt thì hỏng y hệt.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkError || error instanceof TimeoutError) return true;
  return error instanceof ApiError && error.status >= 500;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    // Nhận diện theo `name` chứ không theo `instanceof DOMException`: lớp đó
    // khác nhau giữa trình duyệt, jsdom và Node.
    if (cause instanceof Error && cause.name === 'TimeoutError') throw new TimeoutError();
    throw new NetworkError(cause);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) return payload as T;

  const error = (payload as { error?: { code: string; message: string } } | null)?.error;

  // Sai mật khẩu (đăng nhập, đổi mật khẩu) cũng là 401 nhưng phiên vẫn còn —
  // chỉ các 401 khác mới là hết phiên (BR-027, E11-S1-T2).
  if (response.status === 401 && error?.code !== 'ERR_INVALID_CREDENTIALS') {
    unauthorizedHandler?.();
  }

  throw new ApiError(
    error?.code ?? 'ERR_INTERNAL',
    error?.message ?? 'Có lỗi xảy ra, thử lại sau',
    response.status,
  );
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
