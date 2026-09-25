import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  NetworkError,
  TimeoutError,
  api,
  isRetryable,
  setUnauthorizedHandler,
} from './client';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  // Chỗ xử lý 401 là state cấp module, không tự reset giữa các test.
  setUnauthorizedHandler(() => {});
});

describe('client gọi API', () => {
  it('ghép tiền tố /api và trả thẳng payload khi thành công', async () => {
    const fetchMock = mockFetch(201, { id: 'card-1' });

    await expect(api.post('/cards', { front: 'a', back: 'b' })).resolves.toEqual({ id: 'card-1' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/cards');
  });

  it('lỗi nghiệp vụ thành ApiError mang đúng mã và thông điệp của máy chủ', async () => {
    mockFetch(400, {
      error: { code: 'ERR_EMPTY_BACK', message: 'Mặt trả lời của thẻ không được để trống' },
    });

    await expect(api.post('/cards', {})).rejects.toMatchObject({
      name: 'ApiError',
      code: 'ERR_EMPTY_BACK',
      status: 400,
      message: 'Mặt trả lời của thẻ không được để trống',
    });
  });

  it('không tới được máy chủ thì thành NetworkError, không phải ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await api.get('/cards/due').catch((error: unknown) => error);

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  it('401 gọi đúng một lần vào chỗ xử lý đã đăng ký', async () => {
    mockFetch(401, { error: { code: 'ERR_UNAUTHORIZED', message: 'Vui lòng đăng nhập lại' } });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(api.get('/cards/due')).rejects.toThrow(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('E11-S1-T2: 401 sai mật khẩu không phải hết phiên — không gọi chỗ xử lý 401', async () => {
    mockFetch(401, {
      error: { code: 'ERR_INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' },
    });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(api.post('/auth/password', {})).rejects.toMatchObject({
      code: 'ERR_INVALID_CREDENTIALS',
      status: 401,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('502/503/504 đáng thử lại — máy chủ chết sau proxy, không phải lỗi nghiệp vụ', async () => {
    for (const status of [502, 503, 504]) {
      mockFetch(status, null);
      const error = await api.get('/cards/due').catch((cause: unknown) => cause);
      expect(isRetryable(error)).toBe(true);
    }
  });

  it('lỗi nghiệp vụ không đáng thử lại dù cùng là ApiError', async () => {
    mockFetch(400, { error: { code: 'ERR_EMPTY_BACK', message: 'x' } });
    const badRequest = await api.post('/cards', {}).catch((cause: unknown) => cause);

    mockFetch(404, { error: { code: 'ERR_CARD_NOT_FOUND', message: 'x' } });
    const notFound = await api.post('/review-outcomes', {}).catch((cause: unknown) => cause);

    expect(isRetryable(badRequest)).toBe(false);
    expect(isRetryable(notFound)).toBe(false);
  });

  it('mất mạng và quá hạn đều đáng thử lại', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(isRetryable(await api.get('/x').catch((cause: unknown) => cause))).toBe(true);

    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));

    const error = await api.get('/x').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(isRetryable(error)).toBe(true);
  });

  it('mọi request đều mang signal có hạn', async () => {
    const fetchMock = mockFetch(200, {});
    await api.get('/cards/due');

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
