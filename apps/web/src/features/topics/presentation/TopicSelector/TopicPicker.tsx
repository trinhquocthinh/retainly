import { useTopics } from '../../application/useTopics';
import { createTopic, fetchTopics } from '../../infrastructure/topicsApi';
import { TopicSelector } from './TopicSelector';

type TopicPickerProps = {
  /** '' là "Chưa phân nhánh". */
  value: string;
  onChange: (topicId: string) => void;
};

/** `TopicSelector` đã nối sẵn API Topic — màn dùng chỉ cần giá trị và `onChange`. */
export function TopicPicker({ value, onChange }: TopicPickerProps) {
  const topics = useTopics({ fetchTopics, createTopic });

  return (
    <TopicSelector
      topics={topics.topics}
      value={value}
      loading={topics.loading}
      loadError={topics.loadError}
      creating={topics.creating}
      createError={topics.createError}
      onChange={onChange}
      onReload={topics.reload}
      onCreate={topics.addTopic}
      onResetCreate={topics.resetCreate}
    />
  );
}
