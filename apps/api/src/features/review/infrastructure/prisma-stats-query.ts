import { prisma } from '../../../shared/prisma';
import type { StatsQuery, TopicStatsRow } from '../application/get-stats';

type TopicRow = Omit<TopicStatsRow, 'topic'> & { topicId: string; topicName: string };

export const prismaStatsQuery: StatsQuery = {
  async countOutcomes(userId, since) {
    const [row] = await prisma.$queryRaw<{ remembered: number; total: number }[]>`
      select (count(*) filter (where ro.outcome = 'remembered'))::int as remembered,
             count(*)::int as total
      from review_outcomes ro
      join cards c on c.id = ro.card_id
      where c.user_id = ${userId}::uuid
        and (${since}::timestamptz is null or ro.reviewed_at >= ${since})
    `;

    return row!;
  },

  countReviewsByDay(userId, since) {
    return prisma.$queryRaw<{ date: string; reviews: number }[]>`
      select to_char(ro.reviewed_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as date,
             count(*)::int as reviews
      from review_outcomes ro
      join cards c on c.id = ro.card_id
      where c.user_id = ${userId}::uuid and ro.reviewed_at >= ${since}
      group by 1
      order by 1
    `;
  },

  async countDurable(userId, stabilityAbove) {
    const [row] = await prisma.$queryRaw<{ cards: number; totalCards: number }[]>`
      select (count(*) filter (
               where rs.last_reviewed_at is not null and rs.stability > ${stabilityAbove}
             ))::int as cards,
             count(*)::int as "totalCards"
      from cards c
      join review_schedules rs on rs.card_id = c.id
      where c.user_id = ${userId}::uuid
    `;

    return row!;
  },

  async summarizeTopics(userId, { since, dueBy }) {
    // Gom lượt ôn và lịch hiện tại ở hai nhánh riêng: join thẳng thì mỗi lượt ôn
    // nhân bản dòng lịch, làm sai số thẻ đến hạn và độ khó trung bình.
    const rows = await prisma.$queryRaw<TopicRow[]>`
      with reviews as (
        select c.topic_id,
               count(*)::int as reviews,
               (count(*) filter (where ro.outcome = 'forgotten'))::int as forgotten
        from review_outcomes ro
        join cards c on c.id = ro.card_id
        where c.user_id = ${userId}::uuid
          and c.topic_id is not null
          and (${since}::timestamptz is null or ro.reviewed_at >= ${since})
        group by c.topic_id
      ),
      schedules as (
        select c.topic_id,
               avg(rs.difficulty) filter (where rs.last_reviewed_at is not null)
                 as "averageDifficulty",
               (count(*) filter (where rs.due_date <= ${dueBy}))::int as "dueCount"
        from cards c
        join review_schedules rs on rs.card_id = c.id
        where c.user_id = ${userId}::uuid and c.topic_id is not null
        group by c.topic_id
      )
      select t.id as "topicId", t.name as "topicName",
             r.reviews, r.forgotten,
             r.forgotten::double precision / r.reviews as "forgetRate",
             s."averageDifficulty", s."dueCount"
      from reviews r
      join knowledge_topics t on t.id = r.topic_id and t.user_id = ${userId}::uuid
      join schedules s on s.topic_id = r.topic_id
      order by "forgetRate" desc, t.name asc, t.id asc
    `;

    return rows.map(({ topicId, topicName, ...row }) => ({
      topic: { id: topicId, name: topicName },
      ...row,
    }));
  },
};
