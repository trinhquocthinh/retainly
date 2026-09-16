import './ModeTabs.css';

export type CreateMode = 'manual' | 'url';

const TABS: { mode: CreateMode; label: string }[] = [
  { mode: 'manual', label: 'Gõ tay' },
  { mode: 'url', label: 'Từ URL' },
];

type ModeTabsProps = {
  mode: CreateMode;
  onModeChange: (mode: CreateMode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Cách tạo thẻ">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          type="button"
          role="tab"
          aria-selected={mode === tab.mode}
          className={`mode-tabs__tab text-small ${mode === tab.mode ? 'mode-tabs__tab--active' : ''}`}
          onClick={() => onModeChange(tab.mode)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
