import type { FastifyInstance } from 'fastify';

import {
  createCard,
  type CardRepository,
  type SourceOwnership,
  type TopicOwnership,
} from '../application/create-card';
import { listCards, type CardListQuery } from '../application/list-cards';
import { deleteCard, type CardDeleteRepository } from '../application/delete-card';
import { updateCard, type CardUpdateRepository } from '../application/update-card';
import { requireAuth } from '../../../shared/request-auth';

// Ghi chú tuỳ chọn; null (hoặc chuỗi trắng) nghĩa là không có / xoá ghi chú.
const NOTE_SCHEMA = { type: ['string', 'null'], maxLength: 1000 } as const;

type CreateBody = {
  sourceId?: string;
  topicId?: string;
  front: string;
  back: string;
  note?: string | null;
};

type UpdateBody = {
  front?: string;
  back?: string;
  note?: string | null;
};

type CardParams = {
  id: string;
};

type Query = {
  page?: number;
  pageSize?: number;
  sourceId?: string;
};

type CardsRouteDeps = {
  cards: CardRepository & CardUpdateRepository & CardDeleteRepository;
  cardList: CardListQuery;
  sources: SourceOwnership;
  topics: TopicOwnership;
  now: () => Date;
};

export function registerCardsRoutes(app: FastifyInstance, deps: CardsRouteDeps): void {
  app.get<{ Querystring: Query }>(
    '/api/cards',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
            pageSize: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            sourceId: {
              type: 'string',
              format: 'uuid',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await listCards(
        { cards: deps.cardList },
        {
          userId: requireAuth(request).userId,
          page: request.query.page ?? 1,
          pageSize: request.query.pageSize ?? 20,
          sourceId: request.query.sourceId,
        },
      );

      return reply.status(200).send(result);
    },
  );

  app.post<{ Body: CreateBody }>(
    '/api/cards',
    {
      schema: {
        body: {
          type: 'object',
          required: ['front', 'back'],
          properties: {
            // format uuid chặn ngay ở tầng schema: cột source_id là UUID, chuỗi
            // sai dạng mà xuống tới Postgres sẽ thành lỗi 500 thay vì 400.
            sourceId: { type: 'string', format: 'uuid' },
            topicId: { type: 'string', format: 'uuid' },
            front: { type: 'string', maxLength: 2000 },
            back: { type: 'string', maxLength: 2000 },
            note: NOTE_SCHEMA,
          },
        },
      },
    },
    async (request, reply) => {
      const card = await createCard(deps, { userId: requireAuth(request).userId, ...request.body });
      return reply.status(201).send(card);
    },
  );

  app.patch<{ Params: CardParams; Body: UpdateBody }>(
    '/api/cards/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
          },
        },
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            front: {
              type: 'string',
              maxLength: 2000,
            },
            back: {
              type: 'string',
              maxLength: 2000,
            },
            note: NOTE_SCHEMA,
          },
        },
      },
    },
    async (request, reply) => {
      const card = await updateCard(
        { cards: deps.cards },
        {
          userId: requireAuth(request).userId,
          cardId: request.params.id,
          front: request.body.front,
          back: request.body.back,
          note: request.body.note,
        },
      );

      return reply.status(200).send(card);
    },
  );

  app.delete<{ Params: CardParams }>(
    '/api/cards/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await deleteCard(
        { cards: deps.cards },
        {
          userId: requireAuth(request).userId,
          cardId: request.params.id,
        },
      );

      return reply.status(200).send(result);
    },
  );
}
