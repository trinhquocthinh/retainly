import { describe, it, expect } from 'vitest';

import { buildApp } from './app';
import { AppError } from './shared/errors';

describe('E0-S2-T3 — Fastify skeleton', () => {
  it('GET /api/health trả 200', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('đường dẫn không tồn tại trả 404 đúng khuôn lỗi', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/khong-ton-tai' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('ERR_NOT_FOUND');
    await app.close();
  });

  it('AppError được ánh xạ đúng mã HTTP và thông điệp người dùng', async () => {
    const app = buildApp();
    app.get('/api/test-loi', async () => {
      throw new AppError('ERR_CARD_NOT_FOUND');
    });
    const res = await app.inject({ method: 'GET', url: '/api/test-loi' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toEqual({
      code: 'ERR_CARD_NOT_FOUND',
      message: 'Không tìm thấy thẻ này',
    });
    await app.close();
  });

  it('lỗi ngoài dự kiến trả 500 và không rò rỉ chi tiết', async () => {
    const app = buildApp();
    app.get('/api/test-no', async () => {
      throw new Error('chi tiet nhay cam khong duoc lo ra');
    });
    const res = await app.inject({ method: 'GET', url: '/api/test-no' });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('ERR_INTERNAL');
    expect(res.payload).not.toContain('nhay cam');
    await app.close();
  });
});
