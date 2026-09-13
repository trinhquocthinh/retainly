import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, NetworkError, api, setUnauthorizedHandler } from './client';

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
});
