export type TopicForgetRate = {
  topicId: string;
  topicName: string;
  forgetRate: number;
  totalReviews: number;
};

export type TopicForgetRateQuery = {
  findByUser(userId: string): Promise<TopicForgetRate[]>;
};

export async function getTopicForgetRates(
  deps: { forgetRates: TopicForgetRateQuery },
  input: { userId: string },
): Promise<{ topics: TopicForgetRate[] }> {
  return { topics: await deps.forgetRates.findByUser(input.userId) };
}
