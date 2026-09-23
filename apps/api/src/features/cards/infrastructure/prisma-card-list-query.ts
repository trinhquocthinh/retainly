import { Prisma } from '../../../generated/prisma/client';
import { prisma } from '../../../shared/prisma';
import type {
  CardListItem,
  CardListQuery,
  CardListQueryInput,
  CardSort,
} from '../application/list-cards';
import { MARKUP_PATTERN } from '../domain/card-search';

/** Lịch trả về dạng cột phẳng — `json_build_object` sẽ biến mốc thời gian thành chuỗi. */
type CardRow = Omit<CardListItem, 'schedule'> & CardListItem['schedule'];

// Cột cuối luôn là id để phân trang ổn định khi các giá trị trước đó hoà nhau.
// Thẻ chưa ôn có S = D = 0, nên khi sắp theo S/D phải đẩy xuống cuối — nếu
// không, "độ ổn định thấp nhất" sẽ toàn thẻ chưa học chứ không phải thẻ sắp quên.
const ORDER_BY: Record<CardSort, Prisma.Sql> = {
  recent: Prisma.sql`c.created_at desc, c.id desc`,
  due: Prisma.sql`rs.due_date asc, c.id asc`,
  stability: Prisma.sql`(rs.state = 'new') asc, rs.stability asc, c.id asc`,
  difficulty: Prisma.sql`(rs.state = 'new') asc, rs.difficulty desc, c.id asc`,
};

/** `%`, `_` và `\` trong từ khoá là chữ thường, không phải ký tự đại diện của ILIKE. */
function containsPattern(keyword: string): string {
  return `%${keyword.replace(/[\\%_]/g, '\\$&')}%`;
}

/** So khớp trên chữ đã gỡ ký hiệu định dạng, không phân biệt hoa/thường lẫn dấu. */
function matches(column: Prisma.Sql, pattern: string): Prisma.Sql {
  return Prisma.sql`unaccent(regexp_replace(${column}, ${MARKUP_PATTERN}, '', 'g')) ILIKE unaccent(${pattern})`;
}

/** Điều kiện chung của danh sách và số đếm theo Topic — chưa gồm bộ lọc Topic. */
function baseConditions(input: CardListQueryInput): Prisma.Sql[] {
  const conditions = [Prisma.sql`c.user_id = ${input.userId}::uuid`];

  if (input.sourceId !== undefined) {
    conditions.push(Prisma.sql`c.source_id = ${input.sourceId}::uuid`);
  }

  if (input.keyword !== undefined) {
    const pattern = containsPattern(input.keyword);
    conditions.push(
      Prisma.sql`(${matches(Prisma.sql`c.front`, pattern)} OR ${matches(Prisma.sql`c.back`, pattern)} OR ${matches(Prisma.sql`coalesce(c.note, '')`, pattern)})`,
    );
  }

  return conditions;
}

function topicCondition(topicId: string | null): Prisma.Sql {
  return topicId === null
    ? Prisma.sql`c.topic_id is null`
    : Prisma.sql`c.topic_id = ${topicId}::uuid`;
}

function toItem({
  state,
  dueDate,
  stability,
  difficulty,
  lastReviewedAt,
  ...card
}: CardRow): CardListItem {
  return { ...card, schedule: { state, dueDate, stability, difficulty, lastReviewedAt } };
}

export const prismaCardListQuery: CardListQuery = {
  async list(input) {
    const base = baseConditions(input);
    const facetWhere = Prisma.join(base, ' AND ');
    const where = Prisma.join(
      input.topicId === undefined ? base : [...base, topicCondition(input.topicId)],
      ' AND ',
    );

    return prisma.$transaction(
      async (tx) => {
        const [countRows, rows, totals, topics] = await Promise.all([
          tx.$queryRaw<{ total: number }[]>`
            select count(*)::int as total
            from cards c
            join review_schedules rs on rs.card_id = c.id
            where ${where}
          `,
          tx.$queryRaw<CardRow[]>`
            select c.id, c.source_id as "sourceId", c.front, c.back, c.note,
                   c.created_at as "createdAt",
                   case when t.id is null then null
                        else json_build_object('id', t.id, 'name', t.name) end as topic,
                   case when s.id is null then null
                        else json_build_object('id', s.id, 'title', s.title) end as source,
                   rs.state::text as state, rs.due_date as "dueDate",
                   rs.stability, rs.difficulty, rs.last_reviewed_at as "lastReviewedAt"
            from cards c
            join review_schedules rs on rs.card_id = c.id
            left join knowledge_topics t on t.id = c.topic_id
            left join sources s on s.id = c.source_id
            where ${where}
            order by ${ORDER_BY[input.sort]}
            limit ${input.pageSize} offset ${(input.page - 1) * input.pageSize}
          `,
          tx.$queryRaw<{ all: number; unassigned: number }[]>`
            select count(*)::int as "all",
                   (count(*) filter (where c.topic_id is null))::int as unassigned
            from cards c
            join review_schedules rs on rs.card_id = c.id
            where ${facetWhere}
          `,
          // Mọi Topic của user, kể cả Topic chưa có thẻ nào khớp (đếm 0).
          tx.$queryRaw<{ id: string; name: string; cardCount: number }[]>`
            select t.id, t.name, count(c.id)::int as "cardCount"
            from knowledge_topics t
            left join (cards c join review_schedules rs on rs.card_id = c.id)
              on c.topic_id = t.id and ${facetWhere}
            where t.user_id = ${input.userId}::uuid
            group by t.id, t.name
            order by t.name asc, t.id asc
          `,
        ]);

        return {
          items: rows.map(toItem),
          totalItems: countRows[0]?.total ?? 0,
          topicCounts: {
            all: totals[0]?.all ?? 0,
            unassigned: totals[0]?.unassigned ?? 0,
            topics,
          },
        };
      },
      {
        isolationLevel: 'RepeatableRead',
      },
    );
  },
};
