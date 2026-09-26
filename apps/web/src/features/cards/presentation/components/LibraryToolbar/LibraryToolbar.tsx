import { useEffect, useRef, useState } from 'react';

import { IconGrid, IconSearch, IconTable } from '@src/shared/ui/Icons/Icons';

import type { LibraryLayout } from '../../../application/useLibraryLayout';

import {
  CARD_SORTS,
  SEARCH_MAX_LENGTH,
  SORT_LABELS,
  UNASSIGNED_TOPIC,
  type CardSort,
  type TopicCounts,
} from '../../../domain/cardLibrary';

import './LibraryToolbar.css';

const SEARCH_DELAY_MS = 300;
const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Xem dạng lưới', Icon: IconGrid },
  { value: 'table', label: 'Xem dạng bảng', Icon: IconTable },
] as const;

type LibraryToolbarProps = {
  query: string;
  sort: CardSort;
  topic: string;
  /** Chưa có khi trang đang tải lần đầu. */
  counts: TopicCounts | undefined;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: CardSort) => void;
  onTopicChange: (topic: string) => void;
  /** Không truyền thì ẩn nút chuyển kiểu xem (mobile, tablet). */
  layout?: { value: LibraryLayout; onChange: (layout: LibraryLayout) => void };
};

function TopicChip({
  label,
  count,
  active,
  onSelect,
}: {
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="library-toolbar__chip text-caption"
      aria-pressed={active}
      onClick={onSelect}
    >
      {label} <span className="library-toolbar__chip-count">{count}</span>
    </button>
  );
}

export function LibraryToolbar({
  query,
  sort,
  topic,
  counts,
  layout,
  onQueryChange,
  onSortChange,
  onTopicChange,
}: LibraryToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(query);
  const [committed, setCommitted] = useState(query);

  // Từ khoá bị đổi từ bên ngoài (nút "Xoá bộ lọc", đổi URL) thì ô nhập theo.
  if (query !== committed) {
    setCommitted(query);
    setDraft(query);
  }

  useEffect(() => {
    if (draft === query) return;

    const timer = window.setTimeout(() => onQueryChange(draft), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, query, onQueryChange]);

  useEffect(() => {
    function focusOnShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      inputRef.current?.focus();
    }

    window.addEventListener('keydown', focusOnShortcut);
    return () => window.removeEventListener('keydown', focusOnShortcut);
  }, []);

  return (
    <section className="library-toolbar surface-panel" aria-label="Tìm kiếm và lọc thẻ">
      <div className="library-toolbar__row">
        <div className="library-toolbar__search">
          <span className="library-toolbar__search-icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            ref={inputRef}
            type="search"
            aria-label="Tìm trong thư viện"
            placeholder="Tìm câu hỏi, đáp án hoặc ghi chú…"
            maxLength={SEARCH_MAX_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || draft === '') return;
              event.preventDefault();
              setDraft('');
              onQueryChange('');
            }}
          />
          <span className="library-toolbar__shortcut" aria-hidden="true">
            <kbd className="compact-chip key-hint">⌘</kbd>
            <kbd className="compact-chip key-hint">K</kbd>
          </span>
        </div>

        <select
          className="library-toolbar__sort"
          aria-label="Sắp xếp thẻ"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as CardSort)}
        >
          {CARD_SORTS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>

        {layout ? (
          <div className="library-toolbar__layout" role="group" aria-label="Kiểu hiển thị">
            {LAYOUT_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className="library-toolbar__layout-button"
                aria-label={label}
                aria-pressed={layout.value === value}
                onClick={() => layout.onChange(value)}
              >
                <Icon />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {counts ? (
        <div className="library-toolbar__chips" role="group" aria-label="Lọc theo chủ đề">
          <TopicChip
            label="Tất cả"
            count={counts.all}
            active={topic === ''}
            onSelect={() => onTopicChange('')}
          />
          {counts.topics.map((item) => (
            <TopicChip
              key={item.id}
              label={item.name}
              count={item.cardCount}
              active={topic === item.id}
              onSelect={() => onTopicChange(item.id)}
            />
          ))}
          <TopicChip
            label="Chưa có chủ đề"
            count={counts.unassigned}
            active={topic === UNASSIGNED_TOPIC}
            onSelect={() => onTopicChange(UNASSIGNED_TOPIC)}
          />
        </div>
      ) : null}
    </section>
  );
}
