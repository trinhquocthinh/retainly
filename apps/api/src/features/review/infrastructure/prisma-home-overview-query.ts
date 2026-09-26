import { prisma } from '../../../shared/prisma';
import type {
  HomeOverviewQuery,
  TodayProgress,
  UpcomingCard,
} from '../application/get-home-overview';

type TopicDueRow = { topicId: string | null; topicName: string | null; count: number };

export const prismaHomeOverviewQuery: HomeOverviewQuery = {
  async countTodayProgress(userId, { reviewedSince, dueBy }) {
    // Mỗi thẻ một dòng, nên thẻ vừa ôn hôm nay mà vẫn còn hạn chỉ được đếm một lần.
    const [row] = await prisma.$queryRaw<TodayProgress[]>`
      select (count(*) filter (where t.reviewed))::int as reviewed,
             count(*)::int as total
      from (
        select rs.due_date <= ${dueBy} as due,
               exists (
                 select 1 from review_outcomes ro
                 where ro.card_id = c.id and ro.reviewed_at >= ${reviewedSince}
               ) as reviewed
        from cards c
        join review_schedules rs on rs.card_id = c.id
        where c.user_id = ${userId}::uuid
      ) t
      where t.due or t.reviewed
    `;

    return row!;
  },

  async summarizeLibrary(userId, difficultAbove) {
    const [row] = await prisma.$queryRaw<
      { totalCards: number; topicCount: number; difficultCards: number }[]
    >`
      select count(*)::int as "totalCards",
             count(distinct c.topic_id)::int as "topicCount",
             (count(*) filter (
               where rs.last_reviewed_at is not null and rs.difficulty > ${difficultAbove}
             ))::int as "difficultCards"
      from cards c
      join review_schedules rs on rs.card_id = c.id
      where c.user_id = ${userId}::uuid
    `;

    return row!;
  },

  async countDueByTopic(userId, dueBy) {
    const rows = await prisma.$queryRaw<TopicDueRow[]>`
      select t.id as "topicId", t.name as "topicName", count(*)::int as count
      from cards c
      join review_schedules rs on rs.card_id = c.id
      left join knowledge_topics t on t.id = c.topic_id
      where c.user_id = ${userId}::uuid and rs.due_date <= ${dueBy}
      group by t.id, t.name
      order by count desc, t.name asc nulls last, t.id asc
    `;

    return rows.map(({ topicId, topicName, count }) => ({
      topic: topicId === null ? null : { id: topicId, name: topicName! },
      count,
    }));
  },

  findUpcoming(userId, { dueAfter, limit }) {
    return prisma.$queryRaw<UpcomingCard[]>`
      select c.id, c.front, c.back,
             case when t.id is null then null
                  else json_build_object('id', t.id, 'name', t.name) end as topic,
             rs.due_date as "dueDate", rs.reps
      from cards c
      join review_schedules rs on rs.card_id = c.id
      left join knowledge_topics t on t.id = c.topic_id
      where c.user_id = ${userId}::uuid and rs.due_date > ${dueAfter}
      order by rs.due_date asc, c.id asc
      limit ${limit}
    `;
  },
};
