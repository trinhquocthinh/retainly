import { describe, expect, it, vi } from 'vitest';

import { getTopicForgetRates, type TopicForgetRateQuery } from './get-topic-forget-rates';

describe('E6-S1-T1 — lấy tỷ lệ quên theo topic', () => {
  it('TC-019/020: trả kết quả của query và truyền đúng userId', async () => {
    const findByUser = vi.fn<TopicForgetRateQuery['findByUser']>().mockResolvedValue([
      {
        topicId: 'topic-a',
        topicName: 'Topic A',
        forgetRate: 0.3,
        totalReviews: 10,
      },
    ]);

    await expect(
      getTopicForgetRates({ forgetRates: { findByUser } }, { userId: 'user-a' }),
    ).resolves.toEqual({
      topics: [
        {
          topicId: 'topic-a',
          topicName: 'Topic A',
          forgetRate: 0.3,
          totalReviews: 10,
        },
      ],
    });
    expect(findByUser).toHaveBeenCalledWith('user-a');
  });
});
