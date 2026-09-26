import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';
import { assignTopicToCard } from '../application/assign-topic-to-card';
import { prismaCardTopicRepository, prismaTopicRepository } from './prisma-topic-repository';

async function seedCard(userId: string) {
  return testPrisma.card.create({
    data: { userId, front: 'Hỏi', back: 'Đáp' },
  });
}

beforeEach(resetDatabase);

describe('E5-S1-T2 — topic repository trên PostgreSQL', () => {
  it('tạo và liệt kê theo đúng user, sắp xếp theo tên', async () => {
    await prismaTopicRepository.create({ userId: TEST_USER_ID, name: 'Zoology' });
    await prismaTopicRepository.create({ userId: TEST_USER_ID, name: 'Algorithms' });
    await prismaTopicRepository.create({ userId: OTHER_USER_ID, name: 'Bí mật' });

    const topics = await prismaTopicRepository.listByUser(TEST_USER_ID);

    expect(topics.map(({ name }) => name)).toEqual(['Algorithms', 'Zoology']);
  });

  it('unique (userId, name) chặn tên trùng trong cùng user nhưng cho phép khác user', async () => {
    await expect(
      prismaTopicRepository.create({ userId: TEST_USER_ID, name: 'Khoa học' }),
    ).resolves.not.toBeNull();
    await expect(
      prismaTopicRepository.create({ userId: TEST_USER_ID, name: 'Khoa học' }),
    ).resolves.toBeNull();
    await expect(
      prismaTopicRepository.create({ userId: OTHER_USER_ID, name: 'Khoa học' }),
    ).resolves.not.toBeNull();
  });

  it('TC-017: gán và gỡ topic cùng chủ sở hữu', async () => {
    const card = await seedCard(TEST_USER_ID);
    const topic = await prismaTopicRepository.create({ userId: TEST_USER_ID, name: 'Khoa học' });
    if (topic === null) throw new Error('Không seed được topic');

    await expect(
      assignTopicToCard(
        { topics: prismaTopicRepository, cards: prismaCardTopicRepository },
        { userId: TEST_USER_ID, cardId: card.id, topicId: topic.id },
      ),
    ).resolves.toMatchObject({ id: card.id, topicId: topic.id });

    await expect(
      assignTopicToCard(
        { topics: prismaTopicRepository, cards: prismaCardTopicRepository },
        { userId: TEST_USER_ID, cardId: card.id, topicId: null },
      ),
    ).resolves.toMatchObject({ id: card.id, topicId: null });
  });

  it('TC-018: topic của user khác không được gán và card không thay đổi', async () => {
    const card = await seedCard(TEST_USER_ID);
    const foreignTopic = await prismaTopicRepository.create({
      userId: OTHER_USER_ID,
      name: 'Bí mật',
    });
    if (foreignTopic === null) throw new Error('Không seed được topic');

    await expect(
      assignTopicToCard(
        { topics: prismaTopicRepository, cards: prismaCardTopicRepository },
        { userId: TEST_USER_ID, cardId: card.id, topicId: foreignTopic.id },
      ),
    ).rejects.toMatchObject({ code: 'ERR_TOPIC_NOT_FOUND' });

    await expect(
      testPrisma.card.findUniqueOrThrow({ where: { id: card.id } }),
    ).resolves.toMatchObject({
      topicId: null,
    });
  });

  it('xóa topic đặt topicId của card về null', async () => {
    const card = await seedCard(TEST_USER_ID);
    const topic = await testPrisma.knowledgeTopic.create({
      data: { userId: TEST_USER_ID, name: 'Khoa học', cards: { connect: { id: card.id } } },
    });

    await testPrisma.knowledgeTopic.delete({ where: { id: topic.id } });

    await expect(
      testPrisma.card.findUniqueOrThrow({ where: { id: card.id } }),
    ).resolves.toMatchObject({
      topicId: null,
    });
  });
});
