import { describe, expect, it } from 'vitest';
import { buildApp } from '../../../app';
import { signInAs } from '../../../shared/test/sign-in-as';
import { registerPracticeRoutes } from './practice-routes';
import type { PracticeRepository } from '../application/practice-repository';

const ID = '11111111-1111-4111-8111-111111111111';
const practices: PracticeRepository = {
  inTransaction: async (_user, work) =>
    work({
      findActive: async () => null,
      findSession: async () => null,
      findCandidates: async () => [],
    } as never),
  overview: async () => ({ activeSessionId: null, completedToday: 0, availableCount: 50 }),
};
function appWith(auth = true) {
  const app = buildApp();
  if (auth) signInAs(app);
  registerPracticeRoutes(app, { practices, now: () => new Date('2026-10-24T03:00:00Z') });
  return app;
}

describe('HTTP bài học', () => {
  it('yêu cầu đăng nhập trước khi bắt đầu bài', async () => {
    const app = appWith(false);
    const result = await app.inject({
      method: 'POST',
      url: '/api/practice-sessions',
      payload: { size: 15 },
    });
    expect(result.statusCode).toBe(401);
    await app.close();
  });
  it.each([0, 11, 50])('từ chối kích thước %i thay vì tạo bài không giới hạn', async (size) => {
    const app = appWith();
    const result = await app.inject({
      method: 'POST',
      url: '/api/practice-sessions',
      payload: { size },
    });
    expect(result.statusCode).toBe(400);
    await app.close();
  });
  it('không có ứng viên trả session null, không tạo bài rỗng', async () => {
    const app = appWith();
    const result = await app.inject({
      method: 'POST',
      url: '/api/practice-sessions',
      payload: { size: 15 },
    });
    expect(result.json()).toEqual({ session: null });
    await app.close();
  });
  it('bài không tồn tại/khác chủ sở hữu trả 404', async () => {
    const app = appWith();
    const result = await app.inject({ method: 'GET', url: `/api/practice-sessions/${ID}` });
    expect(result.statusCode).toBe(404);
    expect(result.json().error.code).toBe('ERR_PRACTICE_NOT_FOUND');
    await app.close();
  });
  it('outcome lạ vẫn dùng mã lỗi nghiệp vụ hiện tại', async () => {
    const app = appWith();
    const result = await app.inject({
      method: 'POST',
      url: `/api/practice-sessions/${ID}/outcomes`,
      payload: { itemId: ID, outcome: 'maybe' },
    });
    expect(result.statusCode).toBe(400);
    expect(result.json().error.code).toBe('ERR_INVALID_OUTCOME');
    await app.close();
  });
  it('Undo bắt buộc chỉ rõ câu trả lời, tránh hoàn tác nhầm khi retry', async () => {
    const app = appWith();
    const result = await app.inject({
      method: 'POST',
      url: `/api/practice-sessions/${ID}/undo`,
      payload: {},
    });
    expect(result.statusCode).toBe(400);
    await app.close();
  });
});
