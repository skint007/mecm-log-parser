import type { FilterPreset } from './LogTable.js';

interface ToolbarProps {
  fileName: string;
  entryCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  filterPreset: FilterPreset;
  onFilterPresetChange: (preset: FilterPreset) => void;
  columnFilters: Record<string, string>;
  onClearColumnFilters: () => void;
  onExportCsv: () => void;
}

const PRESETS: { label: string; value: FilterPreset }[] = [
  { label: 'All', value: 'all' },
  { label: 'Warnings+', value: 'warnings+' },
  { label: 'Errors', value: 'errors' },
];

export function Toolbar({
  fileName,
  entryCount,
  search,
  onSearchChange,
  filterPreset,
  onFilterPresetChange,
  columnFilters,
  onClearColumnFilters,
  onExportCsv,
}: ToolbarProps) {
  const hasColumnFilters = Object.keys(columnFilters).length > 0;
  const columnFilterLabels = Object.entries(columnFilters)
    .map(([field, value]) => `${field}="${value}"`)
    .join(', ');

  return (
    <div className="toolbar">
      <span className="toolbar-filename" title={fileName}>
        {fileName}
      </span>
      <span className="toolbar-count">
        {entryCount.toLocaleString()} entries
      </span>

      <div className="toolbar-presets" role="group" aria-label="Severity filter">
        {PRESETS.map(p => (
          <button
            key={p.value}
            className={`preset-btn${filterPreset === p.value ? ' preset-btn-active' : ''}`}
            onClick={() => onFilterPresetChange(p.value)}
            title={`Show ${p.label.toLowerCase()}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {hasColumnFilters && (
        <button
          className="column-filter-pill"
          onClick={onClearColumnFilters}
          title={`Active column filters: ${columnFilterLabels} — click to clear`}
        >
          {columnFilterLabels} ×
        </button>
      )}

      <div className="toolbar-search">
        <input
          className="toolbar-search-input"
          type="search"
          placeholder="Search entries…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search log entries"
        />
      </div>

      <button
        className="toolbar-export-btn"
        onClick={onExportCsv}
        title="Export visible rows to CSV"
      >
        Export CSV
      </button>
    </div>
  );
}
