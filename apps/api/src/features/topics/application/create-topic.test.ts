import { describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/errors';
import { createTopic, type Topic, type TopicRepository } from './create-topic';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const CREATED_AT = new Date('2026-09-19T12:00:00.000Z');

function fakeRepository(result: Topic | null): TopicRepository & { names: string[] } {
  const names: string[] = [];

  return {
    names,
    async create(input) {
      names.push(input.name);
      return result === null ? null : { ...result, name: input.name };
    },
    async listByUser() {
      return [];
    },
    async belongsToUser() {
      return false;
    },
  };
}

describe('E5-S1-T2 — createTopic', () => {
  it('chuẩn hóa khoảng trắng trước khi tạo topic', async () => {
    const topics = fakeRepository({
      id: '00000000-0000-0000-0000-0000000000a1',
      name: 'Tên cũ',
      createdAt: CREATED_AT,
    });

    const topic = await createTopic({ topics }, { userId: USER_ID, name: '  Khoa học  ' });

    expect(topic.name).toBe('Khoa học');
    expect(topics.names).toEqual(['Khoa học']);
  });

  it('từ chối tên chỉ có khoảng trắng trước khi gọi repository', async () => {
    const topics = fakeRepository(null);

    await expect(createTopic({ topics }, { userId: USER_ID, name: '   ' })).rejects.toThrow(
      new AppError('ERR_BAD_REQUEST'),
    );
    expect(topics.names).toEqual([]);
  });

  it('tên trùng trong cùng tài khoản trả ERR_TOPIC_NAME_TAKEN', async () => {
    const topics = fakeRepository(null);

    await expect(createTopic({ topics }, { userId: USER_ID, name: 'Khoa học' })).rejects.toThrow(
      new AppError('ERR_TOPIC_NAME_TAKEN'),
    );
  });
});
