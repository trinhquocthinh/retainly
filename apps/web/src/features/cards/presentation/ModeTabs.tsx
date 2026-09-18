import { SegmentedTabs } from '@src/shared/ui/SegmentedTabs/SegmentedTabs';

import './ModeTabs.css';

export type CreateMode = 'manual' | 'url';

const TABS = [
  { value: 'manual', label: 'Gõ tay' },
  { value: 'url', label: 'Từ URL' },
] as const;

type ModeTabsProps = {
  mode: CreateMode;
  onModeChange: (mode: CreateMode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <SegmentedTabs
      label="Cách tạo thẻ"
      tabs={TABS}
      value={mode}
      onChange={onModeChange}
      className="mode-tabs"
    />
  );
}
