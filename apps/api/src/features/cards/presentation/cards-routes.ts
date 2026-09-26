import type { FastifyInstance } from 'fastify';

import {
  createCard,
  type CardRepository,
  type SourceOwnership,
  type TopicOwnership,
} from '../application/create-card';
import {
  CARD_SORTS,
  listCards,
  type CardListQuery,
  type CardSort,
} from '../application/list-cards';
import { deleteCard, type CardDeleteRepository } from '../application/delete-card';
import { getLibraryStats, type LibraryScheduleQuery } from '../application/get-library-stats';
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
  /** uuid của Topic, hoặc `none` = chỉ thẻ chưa gán Topic. */
  topic?: string;
  q?: string;
  sort?: CardSort;
};

/** Giá trị `topic` chọn các thẻ chưa gán Topic ("Chưa gán"). */
const UNASSIGNED_TOPIC = 'none';

type CardsRouteDeps = {
  cards: CardRepository & CardUpdateRepository & CardDeleteRepository;
  cardList: CardListQuery;
  libraryStats: LibraryScheduleQuery;
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
            topic: {
              anyOf: [
                { type: 'string', format: 'uuid' },
                { type: 'string', const: UNASSIGNED_TOPIC },
              ],
            },
            q: {
              type: 'string',
              maxLength: 100,
            },
            sort: {
              type: 'string',
              enum: CARD_SORTS,
              default: 'recent',
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
          topicId: request.query.topic === UNASSIGNED_TOPIC ? null : request.query.topic,
          q: request.query.q,
          sort: request.query.sort ?? 'recent',
        },
      );

      return reply.status(200).send(result);
    },
  );

  app.get('/api/cards/stats', async (request) =>
    getLibraryStats(
      { schedules: deps.libraryStats, now: deps.now },
      { userId: requireAuth(request).userId },
    ),
  );

  app.post<{ Body: CreateBody }>(
    '/api/cards',
    {
      schema: {
        body: {
          type: 'object',
          required: ['front', 'back'],
          additionalProperties: false,
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
      // userId đứng sau body: chủ thẻ luôn là người đang đăng nhập (BR-008).
      const card = await createCard(deps, { ...request.body, userId: requireAuth(request).userId });
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
