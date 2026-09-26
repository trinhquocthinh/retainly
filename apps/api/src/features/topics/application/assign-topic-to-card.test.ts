import { describe, expect, it } from 'vitest';

import { AppError } from '../../../shared/errors';
import {
  assignTopicToCard,
  type AssignedCard,
  type CardTopicRepository,
} from './assign-topic-to-card';
import type { TopicRepository } from './create-topic';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const CARD_ID = '00000000-0000-0000-0000-0000000000c1';
const TOPIC_ID = '00000000-0000-0000-0000-0000000000a1';
const CREATED_AT = new Date('2026-09-19T12:00:00.000Z');

const CARD: AssignedCard = {
  id: CARD_ID,
  sourceId: null,
  topicId: TOPIC_ID,
  front: 'Hỏi',
  back: 'Đáp',
  createdAt: CREATED_AT,
};

function fakeTopics(owned: boolean): TopicRepository {
  return {
    async create() {
      return null;
    },
    async listByUser() {
      return [];
    },
    async belongsToUser() {
      return owned;
    },
  };
}

function fakeCards(
  result: AssignedCard | null,
): CardTopicRepository & { topicIds: (string | null)[] } {
  const topicIds: (string | null)[] = [];

  return {
    topicIds,
    async assignOwned(input) {
      topicIds.push(input.topicId);
      return result === null ? null : { ...result, topicId: input.topicId };
    },
  };
}

describe('E5-S1-T2 — assignTopicToCard', () => {
  it('TC-017: gán topic cùng chủ sở hữu vào card', async () => {
    const cards = fakeCards(CARD);

    const updated = await assignTopicToCard(
      { topics: fakeTopics(true), cards },
      { userId: USER_ID, cardId: CARD_ID, topicId: TOPIC_ID },
    );

    expect(updated.topicId).toBe(TOPIC_ID);
    expect(cards.topicIds).toEqual([TOPIC_ID]);
  });

  it('TC-018: topic không thuộc user trả ERR_TOPIC_NOT_FOUND và không sửa card', async () => {
    const cards = fakeCards(CARD);

    await expect(
      assignTopicToCard(
        { topics: fakeTopics(false), cards },
        { userId: USER_ID, cardId: CARD_ID, topicId: TOPIC_ID },
      ),
    ).rejects.toThrow(new AppError('ERR_TOPIC_NOT_FOUND'));
    expect(cards.topicIds).toEqual([]);
  });

  it('card không thuộc user trả ERR_CARD_NOT_FOUND', async () => {
    const cards = fakeCards(null);

    await expect(
      assignTopicToCard(
        { topics: fakeTopics(true), cards },
        { userId: USER_ID, cardId: CARD_ID, topicId: TOPIC_ID },
      ),
    ).rejects.toThrow(new AppError('ERR_CARD_NOT_FOUND'));
  });

  it('topicId null gỡ liên kết mà không tra cứu topic', async () => {
    const cards = fakeCards(CARD);

    const updated = await assignTopicToCard(
      { topics: fakeTopics(false), cards },
      { userId: USER_ID, cardId: CARD_ID, topicId: null },
    );

    expect(updated.topicId).toBeNull();
    expect(cards.topicIds).toEqual([null]);
  });
});
