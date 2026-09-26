export type Topic = {
  id: string;
  name: string;
  createdAt: string;
};

export type TopicsResponse = {
  topics: Topic[];
};
