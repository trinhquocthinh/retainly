import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../../../shared/request-auth';
import { assignTopicToCard, type CardTopicRepository } from '../application/assign-topic-to-card';
import { createTopic, type TopicRepository } from '../application/create-topic';
import { listTopics } from '../application/list-topics';
import { getTopicForgetRates, TopicForgetRateQuery } from '../application/get-topic-forget-rates';

type TopicBody = {
  name: string;
};

type CardParams = {
  id: string;
};

type AssignmentBody = {
  topicId: string | null;
};

type TopicsRouteDeps = {
  topics: TopicRepository;
  cards: CardTopicRepository;
  forgetRates: TopicForgetRateQuery;
};

export function registerTopicsRoutes(app: FastifyInstance, deps: TopicsRouteDeps): void {
  app.post<{ Body: TopicBody }>(
    '/api/topics',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const topic = await createTopic(
        { topics: deps.topics },
        { userId: requireAuth(request).userId, name: request.body.name },
      );
      return reply.status(201).send(topic);
    },
  );

  app.get('/api/topics', async (request, reply) => {
    const result = await listTopics({ topics: deps.topics }, requireAuth(request).userId);
    return reply.status(200).send(result);
  });

  app.get('/api/topics/forget-rate', async (request, reply) => {
    const result = await getTopicForgetRates(
      { forgetRates: deps.forgetRates },
      { userId: requireAuth(request).userId },
    );
    return reply.status(200).send(result);
  });

  app.patch<{ Params: CardParams; Body: AssignmentBody }>(
    '/api/cards/:id/topic',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['topicId'],
          additionalProperties: false,
          properties: {
            topicId: {
              anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const card = await assignTopicToCard(
        { topics: deps.topics, cards: deps.cards },
        {
          userId: requireAuth(request).userId,
          cardId: request.params.id,
          topicId: request.body.topicId,
        },
      );
      return reply.status(200).send(card);
    },
  );
}
