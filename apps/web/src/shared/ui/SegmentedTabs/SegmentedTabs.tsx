import type { CSSProperties } from 'react';

import './SegmentedTabs.css';

type SegmentedTab<T extends string> = { value: T; label: string };

type SegmentedTabsProps<T extends string> = {
  /** Tên của cả nhóm cho trình đọc màn hình. */
  label: string;
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * Công tắc 2–3 lựa chọn dạng viên thuốc: Gõ tay/Từ URL, Đăng nhập/Đăng ký.
 * Nền trắng là một khối riêng trượt sang tab được chọn, không phải nền của nút.
 */
export function SegmentedTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  className = '',
}: SegmentedTabsProps<T>) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value),
  );
  const style = { '--tab-count': tabs.length, '--tab-index': activeIndex } as CSSProperties;

  return (
    <div className={`segmented-tabs ${className}`} role="tablist" aria-label={label} style={style}>
      <span className="segmented-tabs__indicator" aria-hidden="true" />
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={`segmented-tabs__tab text-small ${value === tab.value ? 'segmented-tabs__tab--active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
