import { beforeEach, describe, expect, it } from 'vitest';

import { OTHER_USER_ID, resetDatabase, TEST_USER_ID, testPrisma } from '../../../shared/test/db';
import { prismaTopicForgetRateQuery } from './prisma-topic-forget-rate-query';

type Outcome = 'remembered' | 'forgotten';

async function seedTopicWithOutcomes(
  userId: string,
  name: string,
  outcomes: Outcome[],
): Promise<string> {
  const topic = await testPrisma.knowledgeTopic.create({ data: { userId, name } });

  if (outcomes.length > 0) {
    await testPrisma.card.create({
      data: {
        userId,
        topicId: topic.id,
        front: `Hỏi ${name}`,
        back: `Đáp ${name}`,
        outcomes: { create: outcomes.map((outcome) => ({ outcome })) },
      },
    });
  }

  return topic.id;
}

beforeEach(resetDatabase);

describe('E6-S1-T1 — truy vấn tỷ lệ quên trên PostgreSQL', () => {
  it('TC-019/020: tính đúng tỷ lệ, bỏ topic chưa ôn, sắp xếp giảm dần và cô lập user', async () => {
    const topicAId = await seedTopicWithOutcomes(TEST_USER_ID, 'Topic A', [
      'forgotten',
      'forgotten',
      'forgotten',
      'remembered',
      'remembered',
      'remembered',
      'remembered',
      'remembered',
      'remembered',
      'remembered',
    ]);
    const highestId = await seedTopicWithOutcomes(TEST_USER_ID, 'Topic cao nhất', ['forgotten']);
    await seedTopicWithOutcomes(TEST_USER_ID, 'Topic chưa ôn', []);
    await seedTopicWithOutcomes(OTHER_USER_ID, 'Topic của user khác', ['forgotten']);

    const topics = await prismaTopicForgetRateQuery.findByUser(TEST_USER_ID);

    expect(topics).toEqual([
      {
        topicId: highestId,
        topicName: 'Topic cao nhất',
        forgetRate: 1,
        totalReviews: 1,
      },
      {
        topicId: topicAId,
        topicName: 'Topic A',
        forgetRate: 0.3,
        totalReviews: 10,
      },
    ]);
  });
});
