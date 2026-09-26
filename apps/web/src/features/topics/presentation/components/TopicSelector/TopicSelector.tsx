import { useState } from 'react';

import { Button } from '@src/shared/ui/Button/Button';

import type { Topic } from '../../../domain/topic';

import './TopicSelector.css';

type TopicSelectorProps = {
  topics: Topic[];
  value: string;
  loading: boolean;
  loadError: unknown;
  creating: boolean;
  createError: unknown;
  onChange: (topicId: string) => void;
  onReload: () => void;
  onCreate: (name: string) => Promise<Topic>;
  onResetCreate: () => void;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Không tải được nhánh kiến thức';
}

export function TopicSelector({
  topics,
  value,
  loading,
  loadError,
  creating,
  createError,
  onChange,
  onReload,
  onCreate,
  onResetCreate,
}: TopicSelectorProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  async function submitNewTopic() {
    const normalized = name.trim();
    if (!normalized || creating) return;

    try {
      const topic = await onCreate(normalized);
      onChange(topic.id);
      setName('');
      setAdding(false);
    } catch {
      // Mutation giữ lỗi để render ngay dưới ô nhập.
    }
  }

  function closeCreation() {
    setName('');
    setAdding(false);
    onResetCreate();
  }

  return (
    <div className="topic-selector">
      <div className="topic-selector__heading">
        <label className="text-small" htmlFor="card-topic">
          Nhánh kiến thức
        </label>
        {!adding ? (
          <button
            type="button"
            className="topic-selector__add text-small"
            onClick={() => {
              onResetCreate();
              setAdding(true);
            }}
          >
            Tạo nhánh mới
          </button>
        ) : null}
      </div>

      <p className="topic-selector__description text-caption">
        Giúp nhóm các thẻ cùng chủ đề để theo dõi hiệu quả ghi nhớ.
      </p>

      {loadError ? (
        <div className="topic-selector__load-error feedback-danger text-small" role="alert">
          <span>{messageOf(loadError)}</span>
          <button type="button" onClick={onReload}>
            Thử lại
          </button>
        </div>
      ) : (
        <select
          id="card-topic"
          value={value}
          disabled={loading}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{loading ? 'Đang tải nhánh…' : 'Chưa phân nhánh'}</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      )}

      {adding ? (
        <div className="topic-selector__creation">
          <label className="text-caption" htmlFor="new-topic-name">
            Tên nhánh mới
          </label>
          <div className="topic-selector__creation-row">
            <input
              id="new-topic-name"
              value={name}
              maxLength={100}
              autoFocus
              placeholder="Ví dụ: Khoa học"
              aria-invalid={Boolean(createError)}
              onChange={(event) => {
                setName(event.target.value);
                onResetCreate();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submitNewTopic();
                }
              }}
            />
            <Button
              variant="primary"
              disabled={!name.trim() || creating}
              onClick={() => void submitNewTopic()}
            >
              {creating ? 'Đang thêm…' : 'Thêm'}
            </Button>
            <Button onClick={closeCreation}>Huỷ</Button>
          </div>

          {createError ? (
            <p className="topic-selector__error text-small" role="alert">
              {messageOf(createError)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
