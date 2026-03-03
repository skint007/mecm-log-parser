import { useVsCodeApi } from '../hooks/useVsCodeApi.js';

export interface FileTab {
  filePath: string;
  fileName: string;
  entryCount: number;
}

interface TabBarProps {
  tabs: FileTab[];
  activeTab: string; // filePath or 'merged'
  onTabChange: (tab: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const vscodeApi = useVsCodeApi();
  const showMerged = tabs.length >= 2;

  function closeTab(filePath: string, e: React.MouseEvent) {
    e.stopPropagation();
    vscodeApi.postMessage({ type: 'closeFile', filePath });
    // The App will receive the closeFile action and update state
    // We trigger it here so the webview can handle it without a host round-trip
    const event = new CustomEvent('closeFileTab', { detail: filePath });
    window.dispatchEvent(event);
  }

  return (
    <div className="tab-bar">
      {showMerged && (
        <button
          className={`tab${activeTab === 'merged' ? ' tab-active' : ''}`}
          onClick={() => onTabChange('merged')}
          title="Merged chronological view of all open files"
        >
          <span className="tab-label">Merged</span>
          <span className="tab-count">
            {tabs.reduce((n, t) => n + t.entryCount, 0).toLocaleString()}
          </span>
        </button>
      )}
      {tabs.map(tab => (
        <button
          key={tab.filePath}
          className={`tab${activeTab === tab.filePath ? ' tab-active' : ''}`}
          onClick={() => onTabChange(tab.filePath)}
          onMouseDown={e => { if (e.button === 1) { e.preventDefault(); closeTab(tab.filePath, e); } }}
          title={tab.filePath}
        >
          <span className="tab-label">{tab.fileName}</span>
          <span className="tab-count">{tab.entryCount.toLocaleString()}</span>
          <span
            className="tab-close"
            role="button"
            aria-label={`Close ${tab.fileName}`}
            onClick={e => closeTab(tab.filePath, e)}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
