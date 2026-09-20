import { prisma } from '../../../shared/prisma';
import type { TopicForgetRateQuery } from '../application/get-topic-forget-rates';

type TopicForgetRateRow = {
  topicId: string;
  topicName: string;
  forgetRate: number;
  totalReviews: number;
};

export const prismaTopicForgetRateQuery: TopicForgetRateQuery = {
  async findByUser(userId) {
    return prisma.$queryRaw<TopicForgetRateRow[]>`
      SELECT
        knowledge_topics.id AS "topicId",
        knowledge_topics.name AS "topicName",
        (
          COUNT(*) FILTER (WHERE review_outcomes.outcome = 'forgotten')
        )::double precision / COUNT(*) AS "forgetRate",
        COUNT(*)::integer AS "totalReviews"
      FROM knowledge_topics
      INNER JOIN cards
        ON cards.topic_id = knowledge_topics.id
        AND cards.user_id = knowledge_topics.user_id
      INNER JOIN review_outcomes ON review_outcomes.card_id = cards.id
      WHERE knowledge_topics.user_id = ${userId}::uuid
      GROUP BY knowledge_topics.id, knowledge_topics.name
      ORDER BY "forgetRate" DESC, knowledge_topics.name ASC, knowledge_topics.id ASC
    `;
  },
};
